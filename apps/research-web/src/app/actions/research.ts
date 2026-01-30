'use server';

import { getClient } from '@/utils/apiClient';
import { getAuthUserId } from '@/lib/auth';
import { headers } from 'next/headers';

export async function uploadContract(formData: FormData) {
  try {
    const userId = await getAuthUserId();

    const contractName = formData.get('contractName') as string;
    const file = formData.get('file') as File;
    const totalPages = formData.get('totalPages') as string;
    const localeRaw = formData.get('locale');

    // Handle locale with fallback to URL extraction if needed
    let locale = localeRaw as string;
    if (!locale || locale === 'null' || locale === 'undefined') {
      // Fallback: extract locale from referer header URL
      const headersList = await headers();
      const referer = headersList.get('referer') || '';
      const localeFromUrl = referer.match(/\/([a-z]{2})(?:\/|$)/)?.[1];
      locale = localeFromUrl || 'en';
    }

    if (!contractName || !file || !totalPages) {
      return {
        success: false,
        error: 'Missing required fields: contractName, file, or totalPages'
      };
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return {
        success: false,
        error: 'Only PDF files are allowed'
      };
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = btoa(binaryString);

    // Call the research API using Hono client
    const client = getClient();
    const response = await client.research.$post({
      json: {
        contractName,
        fileName: file.name,
        pdfBase64,
        totalPages: parseInt(totalPages),
        locale: locale || 'en', // Default to English if not provided
      },
      // @ts-ignore
      header: {
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        success: false,
        error: errorData.error || 'Failed to upload contract'
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        research: data.research,
        workflowId: data.workflowId,
        message: data.message
      }
    };
  } catch (error) {
    console.error('Error uploading contract:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload contract'
    };
  }
}

export async function getResearchStatus(researchId: string) {
  try {
    const userId = await getAuthUserId();

    const client = getClient();
    const response = await client.research[':id'].$get({
      param: {
        id: researchId
      },
      // @ts-ignore
      header: {
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        success: false,
        error: errorData.error || 'Failed to fetch research status'
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data.research
    };
  } catch (error) {
    console.error('Error fetching research status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch research status'
    };
  }
}

export async function getAllResearch() {
  try {
    const userId = await getAuthUserId();

    const client = getClient();
    const response = await client.research.$get({
      header: {
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        success: false,
        error: errorData.error || 'Failed to fetch research list'
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data.research
    };
  } catch (error) {
    console.error('Error fetching research list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch research list'
    };
  }
}

export async function triggerComplianceCheck(researchId: string, localeParam?: string) {
  try {
    const userId = await getAuthUserId();

    // Handle locale with fallback to URL extraction if needed
    let locale = localeParam;
    if (!locale || locale === 'null' || locale === 'undefined') {
      // Fallback: extract locale from referer header URL
      const headersList = await headers();
      const referer = headersList.get('referer') || '';
      const localeFromUrl = referer.match(/\/([a-z]{2})(?:\/|$)/)?.[1];
      locale = localeFromUrl || 'en';
    }

    const client = getClient();
    const response = await client.research[':id']['compliance-check'].$post({
      param: {
        id: researchId
      },
      json: {
        locale: locale,
      },
      // @ts-ignore
      header: {
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string; existingCompliance?: any };
      return {
        success: false,
        error: errorData.error || 'Failed to trigger compliance check',
        existingCompliance: errorData.existingCompliance
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        compliance: data.compliance,
        complianceWorkflowId: data.complianceWorkflowId,
        message: data.message
      }
    };
  } catch (error) {
    console.error('Error triggering compliance check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger compliance check'
    };
  }
}

export async function getComplianceStatus(researchId: string) {
  try {
    const userId = await getAuthUserId();

    const client = getClient();
    const response = await client.research[':id'].compliance.$get({
      param: {
        id: researchId
      },
      // @ts-ignore
      header: {
        'x-user-id': userId
      }
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      return {
        success: false,
        error: errorData.error || 'Failed to fetch compliance status'
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data.compliance
    };
  } catch (error) {
    console.error('Error fetching compliance status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch compliance status'
    };
  }
}
