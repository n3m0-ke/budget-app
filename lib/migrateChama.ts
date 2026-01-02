import {
    doc,
    getDoc,
    updateDoc,
    addDoc,
    collection,
  } from "firebase/firestore";
  import { db } from "@/lib/firebase";
import { time } from "console";
  
  /**
   * CONFIG — FILL THESE
   */

  
  const CHAMA_ID = "myaUKhlOR2UiVbLkC0Ci"; // or specific chama
  
  const TRANSACTIONS = [
    {
      transactionId: "8vOUIPdkYHt1NFI3wa6C",
      savingsLedgerAmount: 3000,
      migrateAmount: 3000,
      excess: 0,
    },
    {
      transactionId: "AZnVIQ378XT3WhzLIAno",
      savingsLedgerAmount: 3015,
      migrateAmount: 3000,
      excess: 15,
    },
  ];
  
  export async function migrateChamaSavings(userId: string) {
    
    const USER_ID = userId;

    for (const tx of TRANSACTIONS) {
        const txRef = doc(db, "users", USER_ID, "transactions", tx.transactionId);
        const txSnap = await getDoc(txRef);
    
        if (!txSnap.exists()) {
          console.error(`Transaction ${tx.transactionId} not found`);
          continue;
        } else {
            console.log(`Transaction ${tx.transactionId} found`);
        }
    
        const txData = txSnap.data();
    
        const timestamp = txData.date;
        const budgetMonth = txData.budgetMonth ?? "";

        console.log("Timestamp: ", timestamp);
        console.log("Budget Month: ", budgetMonth);
    
        /**
         * 1. ADD CHAMA CONTRIBUTION (MIGRATION)
         */
        await addDoc(
          collection(db, "users", USER_ID, "chama_ledger"),
          {
            chamaId: CHAMA_ID,
            type: "contribution",
            amount: tx.migrateAmount,
            timestamp,
            budgetMonth,
            source: "migration",
            note: `Migrated from savings transaction ${tx.transactionId}`,
          }
        );
    
        /**
         * 2. REVERSE SAVINGS LEDGER ENTRY
         * (Keeps savings history intact)
         */
        await addDoc(
          collection(db, "users", USER_ID, "savings_ledger"),
          {
            type: "withdrawal",
            amount: tx.savingsLedgerAmount,
            timestamp,
            budgetMonth,
            source: "migration-reversal",
            note: `Reversal due to chama migration (${tx.transactionId})`,
            relatedTransactionId: tx.transactionId,
          }
        );
    
        /**
         * 3. HANDLE EXCESS (3015 → 3000 + 15)
         */
        if (tx.excess > 0) {
          await addDoc(
            collection(db, "users", USER_ID, "transactions"),
            {
              amount: tx.excess,
              category: "Miscellaneous",
              timestamp,
              budgetMonth: "2026-01",
              note: `Correction: excess from chama contribution (${tx.transactionId})`,
              source: "migration",
              relatedTransactionId: tx.transactionId,
              createdAt: new Date().toISOString(),
            }
          );
        }
    
        /**
         * 4. MARK ORIGINAL TRANSACTION AS ADJUSTED
         */
        await updateDoc(txRef, {
          adjusted: true,
          adjustmentNote: "Migrated to chama ledger",
        });
    
        console.log(`Migrated transaction ${tx.transactionId}`);
      }
    
      console.log("Migration completed successfully.");
  }
  