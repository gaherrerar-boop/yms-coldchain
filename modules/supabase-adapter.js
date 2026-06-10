/**
 * Supabase Compatibility Adapter
 * Traduce calls de Supabase → Firebase Firestore
 * Permite que ui.js siga usando sb.from() sin cambios mayores
 */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase.js';

const db = getFirebaseDb();

class SupabaseQueryBuilder {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.constraints = [];
    this._orderBy = null;
    this._limit = null;
    this.data = null;
    this.error = null;
  }

  select(fields = '*') {
    return this;
  }

  where(field, operator, value) {
    if (operator === '==' || operator === 'eq') {
      this.constraints.push(where(field, '==', value));
    } else if (operator === 'in') {
      this.constraints.push(where(field, 'in', value));
    } else if (operator === '!=') {
      this.constraints.push(where(field, '!=', value));
    }
    return this;
  }

  eq(field, value) {
    this.constraints.push(where(field, '==', value));
    return this;
  }

  in(field, values) {
    this.constraints.push(where(field, 'in', values));
    return this;
  }

  order(field, options = {}) {
    this._orderBy = {
      field,
      direction: options.ascending === false ? 'desc' : 'asc'
    };
    return this;
  }

  orderBy(field, direction = 'asc') {
    this._orderBy = { field, direction };
    return this;
  }

  limit(num) {
    this._limit = num;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  async get() {
    try {
      const collRef = collection(db, this.collectionName);
      const constraints = [...this.constraints];

      if (this._orderBy) {
        constraints.push(orderBy(this._orderBy.field, this._orderBy.direction));
      }
      if (this._limit) {
        constraints.push(limit(this._limit));
      }

      const q = query(collRef, ...constraints);
      const snapshot = await getDocs(q);

      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      if (this._single && docs.length > 0) {
        this.data = docs[0];
        return { data: docs[0], error: null };
      }

      this.data = docs;
      return { data: docs, error: null };
    } catch (err) {
      this.error = err.message;
      return { data: null, error: err };
    }
  }

  async insert(data) {
    try {
      const collRef = collection(db, this.collectionName);
      const newDoc = await addDoc(collRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      this.data = { id: newDoc.id, ...data };
      return this;
    } catch (err) {
      this.error = err.message;
      return this;
    }
  }

  async update(data) {
    try {
      // Si hay constraints donde(), actualiza los docs que coincidan
      if (this.constraints.length > 0) {
        const collRef = collection(db, this.collectionName);
        const q = query(collRef, ...this.constraints);
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
          await updateDoc(doc(db, this.collectionName, docSnap.id), {
            ...data,
            updatedAt: serverTimestamp()
          });
        }
      }
      return this;
    } catch (err) {
      this.error = err.message;
      return this;
    }
  }

  async delete() {
    try {
      if (this.constraints.length > 0) {
        const collRef = collection(db, this.collectionName);
        const q = query(collRef, ...this.constraints);
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, this.collectionName, docSnap.id));
        }
      }
      return this;
    } catch (err) {
      this.error = err.message;
      return this;
    }
  }

  async select() {
    return await this.get();
  }

  async single() {
    this._single = true;
    return await this.get();
  }
}

/**
 * Fake Supabase object que mantiene compatibilidad
 * Redirige todos los calls a Firebase
 */
export const sb = {
  from(collectionName) {
    return new SupabaseQueryBuilder(collectionName);
  }
};

export default sb;
