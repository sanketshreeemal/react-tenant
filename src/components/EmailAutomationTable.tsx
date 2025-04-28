import React, { useState, useEffect, useCallback } from "react";
import { AllUser } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { emailEventTemplates } from "@/lib/email/templates/indexEvent";
import { emailReportTemplates } from "@/lib/email/templates/indexReport";
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import logger from "@/lib/logger";

interface EmailAutomationTableProps {
  users: AllUser[];
}

export function EmailAutomationTable({ users }: EmailAutomationTableProps) {
  const [automationMatrix, setAutomationMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadAutomationMatrix = useCallback(async () => {
    try {
      const matrixDocRef = doc(db, 'emailAutomationMatrix', 'matrix');
      const matrixDoc = await getDoc(matrixDocRef);
      
      if (matrixDoc.exists()) {
        setAutomationMatrix(matrixDoc.data() as Record<string, Record<string, boolean>>);
      } else {
        // Initialize with default values
        const initialMatrix: Record<string, Record<string, boolean>> = {};
        users.forEach(user => {
          initialMatrix[user.uid] = {};
          [...emailEventTemplates, ...emailReportTemplates].forEach(template => {
            initialMatrix[user.uid][template.id] = false;
          });
        });
        await setDoc(matrixDocRef, initialMatrix);
        setAutomationMatrix(initialMatrix);
      }
    } catch (error) {
      logger.error('Error loading automation matrix:', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [users]);

  const handleToggle = async (userUid: string, templateId: string) => {
    try {
      const newMatrix = { ...automationMatrix };
      newMatrix[userUid] = {
        ...newMatrix[userUid],
        [templateId]: !newMatrix[userUid]?.[templateId]
      };
      
      const matrixDocRef = doc(db, 'emailAutomationMatrix', 'matrix');
      await updateDoc(matrixDocRef, {
        [userUid]: newMatrix[userUid]
      });
      
      setAutomationMatrix(newMatrix);
    } catch (error) {
      logger.error('Error updating automation matrix:', error as Error);
    }
  };

  useEffect(() => {
    loadAutomationMatrix();
  }, [loadAutomationMatrix]);

  if (isLoading) {
    return <div>Loading automation settings...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            {[...emailEventTemplates, ...emailReportTemplates].map(template => (
              <th key={template.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {template.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map(user => (
            <tr key={user.uid}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
              {[...emailEventTemplates, ...emailReportTemplates].map(template => (
                <td key={template.id} className="px-6 py-4 whitespace-nowrap">
                  <Checkbox
                    checked={automationMatrix[user.uid]?.[template.id] || false}
                    onCheckedChange={() => handleToggle(user.uid, template.id)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 