"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import {
  isNotificationsEnabled,
  getNotificationPermission,
  sendTestCompleteNotification,
  getLastCheckedTestId,
  setLastCheckedTestId,
} from "@/lib/notifications";
import { getTests, getTest } from "@/lib/api";

/**
 * Hook to poll for completed tests and send notifications
 */
export function useTestNotifications() {
  const { data: session } = useSession();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    // Only start polling if user is authenticated, notifications are enabled, and permission is granted
    if (!session?.user || !isNotificationsEnabled() || getNotificationPermission() !== "granted") {
      return;
    }

    // Prevent multiple polling instances
    if (isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    const checkForCompletedTests = async () => {
      try {
        const { tests } = await getTests();
        const lastCheckedId = getLastCheckedTestId();

        // Find the newest completed test
        const completedTests = tests.filter((test) => test.status === "completed");
        if (completedTests.length === 0) {
          return;
        }

        // Sort by completedAt (newest first)
        completedTests.sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime;
        });

        const newestTest = completedTests[0];

        // Only notify if this is a new test (not the last one we checked)
        if (newestTest.id !== lastCheckedId) {
          // Try to get the test details to find the score
          let score: number | undefined;
          try {
            const testDetails = await getTest(newestTest.id);
            if (testDetails.report?.score !== null && testDetails.report?.score !== undefined) {
              score = testDetails.report.score;
            }
          } catch (err) {
            // If we can't get details, just continue without score
            console.error("Error fetching test details:", err);
          }

          const testName = newestTest.targetUrl || "Test Run";
          sendTestCompleteNotification(testName, score);
          setLastCheckedTestId(newestTest.id);
        }
      } catch (error) {
        console.error("Error checking for completed tests:", error);
      }
    };

    // Check immediately, then every 10 seconds
    checkForCompletedTests();
    pollIntervalRef.current = setInterval(checkForCompletedTests, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [session]); // Re-run when session changes

  return null;
}
