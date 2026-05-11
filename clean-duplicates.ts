import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const firebaseConfig = JSON.parse(fs.readFileSync(path.join("c:/Users/AL FAKHIR/Music/smp-islam-modern-al-fakhir---database (2)", "firebase-applet-config.json"), "utf8"));

admin.initializeApp({ projectId: firebaseConfig.projectId });

const dbId = firebaseConfig.firestoreDatabaseId;
let db;
if (dbId) {
    db = admin.app().firestore(dbId);
} else {
    db = admin.firestore();
}

async function clean() {
    const snap = await db.collection("students").get();
    // We want to keep the ones WITH a participant number if possible, or just the more complete one over the dummy one.
    const studentsByNis = new Map();

    snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.nis) {
            if (!studentsByNis.has(data.nis)) {
                studentsByNis.set(data.nis, []);
            }
            studentsByNis.get(data.nis).push({ id: doc.id, ref: doc.ref, data });
        }
    });

    const batch = db.batch();
    let count = 0;

    for (const [nis, docs] of studentsByNis.entries()) {
        if (docs.length > 1) {
            // Sort so the one WITH participantNumber comes first
            docs.sort((a, b) => {
                const aHasNum = a.data.participantNumber ? 1 : 0;
                const bHasNum = b.data.participantNumber ? 1 : 0;
                return bHasNum - aHasNum; // Higher is better
            });

            // keep the first one, delete the rest
            for (let i = 1; i < docs.length; i++) {
                console.log(`Deleting duplicate: ${docs[i].data.name} (NIS: ${nis}) - Keep ID: ${docs[0].id}, Delete ID: ${docs[i].id}`);
                batch.delete(docs[i].ref);
                count++;
            }
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Deleted ${count} duplicates.`);
    } else {
        console.log("No duplicates found by NIS.");
    }
}

clean().then(() => process.exit(0)).catch(console.error);
