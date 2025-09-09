import { firestore } from 'firebase-admin';
import { db } from '../firebase/admin';
import { dateToString } from '../utils/firebase';

export const parseUserData = (
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot<
        FirebaseFirestore.DocumentData,
        FirebaseFirestore.DocumentData
      >
    | firestore.DocumentSnapshot<
        firestore.DocumentData,
        firestore.DocumentData
      >,
  complete = false,
) => {
  if (complete) {
    return {
      id: doc.id,
      name: doc.get('name'),
      email: doc.get('email'),
      avatar: doc.get('avatar'),
      left: doc.get('left'),
      right: doc.get('right'),
      sponsor_id: doc.get('sponsor_id'),
      country: doc.get('country'),
      state: doc.get('state'),
      city: doc.get('city'),
      whatsapp: doc.get('whatsapp'),
      roles: doc.get('roles'),
    };
  }
  return {
    id: doc.id,
    name: doc.get('name'),
    email: doc.get('email'),
    avatar: doc.get('avatar'),
    rank: doc.get('rank'),
    membership: doc.get('membership'),
    is_active: doc.get('membership_status') == 'paid',
    sponsor_id: doc.get('sponsor_id'),
    position: doc.get('position'),
    created_at: dateToString(doc.get('created_at')),
  };
};

const getUsers = async (uid: string) => {
  const snap = await db
    .collection('users')
    .where('sponsor_id', '==', uid)
    .where('membership', '!=', null)
    .get();
  return snap.docs.map((d) => ({
    ...parseUserData(d),
    sponsor_id: d.get('sponsor_id'),
  }));
};

export const getDirectTree = async (user_id: string, deep: number) => {
  const data = [await getUsers(user_id)];

  for (let i = 1; i < deep; i++) {
    const prevIndex = Number(i) - 1;
    if (data[prevIndex])
      for (const u of data[prevIndex]) {
        const docs = await getUsers(u.id);
        if (!data[i]) data[i] = [];
        data[i] = data[i].concat(docs);
      }
  }

  return data;
};
