import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function clean() {
    const snap = await getDocs(collection(db, "students"));
    const studentsByNis = new Map();

    snap.docs.forEach(d => {
        const data = d.data();
        if (data.nis) {
            if (!studentsByNis.has(data.nis)) {
                studentsByNis.set(data.nis, []);
            }
            studentsByNis.get(data.nis).push({ id: d.id, ref: d.ref, data });
        }
    });

    let count = 0;

    for (const [nis, docs] of studentsByNis.entries()) {
        if (docs.length > 1) {
            // Sort so the one WITH participantNumber comes first
            docs.sort((a, b) => {
                const aHasNum = a.data.participantNumber ? 1 : 0;
                const bHasNum = b.data.participantNumber ? 1 : 0;
                return bHasNum - aHasNum;
            });

            // keep the first one, delete the rest
            for (let i = 1; i < docs.length; i++) {
                console.log(`Deleting duplicate: ${docs[i].data.name} (NIS: ${nis}) - Keep ID: ${docs[0].id}`);
                await deleteDoc(docs[i].ref);
                count++;
            }
        }
    }

    if (count > 0) {
        console.log(`Deleted ${count} duplicates.`);
    } else {
        console.log("No duplicates found by NIS.");
    }
}

clean().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
