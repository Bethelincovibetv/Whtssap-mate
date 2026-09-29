import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeFirestoreData } from './firebase';
import { ScheduledCampaign } from '../types';

export interface FirebaseCampaignPayload extends ScheduledCampaign {
  userId: string;
  userEmail?: string;
  updatedAt?: string;
}

/**
 * Persist campaign into Firestore under the user account:
 * 1. Primary: /users/{userId}/campaigns/{campaignId}
 * 2. Global Registry: /campaigns/{campaignId}
 */
export async function saveCampaignToFirebase(
  userId: string,
  userEmail: string | undefined,
  campaign: ScheduledCampaign
): Promise<void> {
  if (!userId) throw new Error('User ID is required to save campaign to Firebase.');

  const campaignData: FirebaseCampaignPayload = sanitizeFirestoreData({
    ...campaign,
    userId,
    userEmail: userEmail || '',
    updatedAt: new Date().toISOString()
  });

  const userCampaignPath = `users/${userId}/campaigns/${campaign.id}`;
  try {
    const userDocRef = doc(db, 'users', userId, 'campaigns', campaign.id);
    await setDoc(userDocRef, campaignData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userCampaignPath);
  }

  // Also sync to global index for cloud auto-posting engine
  const globalCampaignPath = `campaigns/${campaign.id}`;
  try {
    const globalDocRef = doc(db, 'campaigns', campaign.id);
    await setDoc(globalDocRef, campaignData, { merge: true });
  } catch (err) {
    console.warn('[Firebase Global Campaign Sync Note]:', err);
  }
}

/**
 * Delete campaign from Firestore user account & global index
 */
export async function deleteCampaignFromFirebase(userId: string, campaignId: string): Promise<void> {
  if (!userId || !campaignId) return;

  const userCampaignPath = `users/${userId}/campaigns/${campaignId}`;
  try {
    const userDocRef = doc(db, 'users', userId, 'campaigns', campaignId);
    await deleteDoc(userDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, userCampaignPath);
  }

  const globalCampaignPath = `campaigns/${campaignId}`;
  try {
    const globalDocRef = doc(db, 'campaigns', campaignId);
    await deleteDoc(globalDocRef);
  } catch (err) {
    console.warn('[Firebase Global Campaign Delete Note]:', err);
  }
}

/**
 * Load all campaigns saved under user account in Firebase
 */
export async function loadUserCampaignsFromFirebase(userId: string): Promise<ScheduledCampaign[]> {
  if (!userId) return [];

  const path = `users/${userId}/campaigns`;
  try {
    const colRef = collection(db, 'users', userId, 'campaigns');
    const snapshot = await getDocs(colRef);
    const campaigns: ScheduledCampaign[] = [];
    snapshot.forEach(docSnap => {
      campaigns.push(docSnap.data() as ScheduledCampaign);
    });
    return campaigns;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Real-time listener for user campaigns in Firebase
 */
export function subscribeToUserCampaigns(
  userId: string,
  onUpdate: (campaigns: ScheduledCampaign[]) => void
) {
  if (!userId) return () => {};

  const path = `users/${userId}/campaigns`;
  const colRef = collection(db, 'users', userId, 'campaigns');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: ScheduledCampaign[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ScheduledCampaign);
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );

  return unsubscribe;
}
