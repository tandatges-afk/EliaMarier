'use client';
/** V5 UI compatibility layer: real Firebase client auth; Firebase ID tokens go to API routes. */
export {onAuthStateChanged, signInWithEmailAndPassword, signOut} from 'firebase/auth';
export type {User} from 'firebase/auth';
