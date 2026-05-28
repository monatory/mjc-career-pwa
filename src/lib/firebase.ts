/**
 * Firebase 초기화
 * ─────────────────
 * Firebase Web SDK는 API Key를 frontend에 노출하는 것이 정상 동작.
 * 보안은 Authorized Domains + Firestore Security Rules로 처리.
 *
 * 본 운영 전환 시 환경별로 다른 Firebase 프로젝트 사용 시 .env로 분리.
 * 시범운영에서는 단일 프로젝트라 코드에 직접 두는 편이 단순.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTfTs7K-DLcdGNvLYfsH2GDZs1olVDvTI",
  authDomain: "mjc-career-pwa.firebaseapp.com",
  projectId: "mjc-career-pwa",
  storageBucket: "mjc-career-pwa.firebasestorage.app",
  messagingSenderId: "278721966232",
  appId: "1:278721966232:web:76a524761514e821ce20ed",
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function getApp(): FirebaseApp {
  if (!_app) _app = initializeApp(firebaseConfig);
  return _app;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}
