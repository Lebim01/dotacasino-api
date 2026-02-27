require('dotenv').config({ path: './.env' });
const admin = require('firebase-admin');
const fs = require('fs');

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GCP_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || process.env.GCP_PRIVATE_KEY;

if (!privateKeyRaw) {
    console.error("No private key found in .env");
    process.exit(1);
}

const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

const serviceAccount = {
  projectId,
  clientEmail,
  privateKey
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportCollection(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  const data = [];
  
  for (const doc of snapshot.docs) {
    const docData = doc.data();
    const docId = doc.id;
    
    // Convert Timestamps in main doc
    Object.keys(docData).forEach(k => {
        if (docData[k] && typeof docData[k].toDate === 'function') {
            docData[k] = docData[k].toDate().toISOString();
        }
    });

    // Attempt to get subcollections 'sections'
    const sectionsSnapshot = await doc.ref.collection('sections').get();
    const sections = [];
    
    for (const sectionDoc of sectionsSnapshot.docs) {
      const sectionData = sectionDoc.data();
      const sectionId = sectionDoc.id;
      
      // Convert Timestamps in section
      Object.keys(sectionData).forEach(k => {
        if (sectionData[k] && typeof sectionData[k].toDate === 'function') {
            sectionData[k] = sectionData[k].toDate().toISOString();
        }
      });

      // Attempt to get subcollections 'lessons'
      const lessonsSnapshot = await sectionDoc.ref.collection('lessons').get();
      const lessons = lessonsSnapshot.docs.map(l => {
        const d = l.data();
        Object.keys(d).forEach(k => {
            if (d[k] && typeof d[k].toDate === 'function') {
                d[k] = d[k].toDate().toISOString();
            }
        });
        return { id: l.id, ...d };
      });
      
      sections.push({ id: sectionId, ...sectionData, lessons });
    }
    
    data.push({ id: docId, ...docData, sections });
  }
  
  return data;
}

exportCollection('courses')
  .then(data => {
    fs.writeFileSync('courses_full_export.json', JSON.stringify(data, null, 2));
    console.log(`Success: Exported ${data.length} courses to courses_full_export.json`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
