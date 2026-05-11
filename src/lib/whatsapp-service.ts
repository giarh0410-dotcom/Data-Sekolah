export async function sendWhatsAppNotification(phone: string, name: string, status: string, timestamp: string) {
  try {
    const message = `Pemberitahuan Absensi: ${name} telah melakukan absensi pada ${timestamp} dengan status ${status}.`;
    
    const response = await fetch("/api/send-wa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        message,
        name,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error sending WA notification:", error);
    return { success: false, error: "Network error" };
  }
}
