import { Result, ContractBlock, ContractReview } from '@/types/document';

export const MOCK_BLOCKS: ContractBlock[] = [
  {
    paragraph: 'Article 5',
    content: '## ARTICLE 5: TERMINATION AND RENEWAL',
    pageNumber: 1
  },
  {
    paragraph: '5.1',
    content: '**5.1 Termination Rights.** Either party may terminate this Agreement upon thirty (30) days written notice to the other party. Provider may terminate immediately upon written notice if Client fails to pay any undisputed amount within fifteen (15) days of the due date, or if Client materially breaches any provision of this Agreement and fails to cure such breach within ten (10) days of receiving written notice.',
    pageNumber: 1
  },
  {
    paragraph: '5.2',
    content: '**5.2 Effect of Termination.** Upon termination, Client shall immediately cease all use of the Services. Provider shall provide Client with access to retrieve Client Data for a period of thirty (30) days following termination. Client shall pay all fees accrued through the effective date of termination. Any prepaid fees for Services not yet rendered shall be prorated and refunded to Client within thirty (30) days.',
    pageNumber: 1
  },
  {
    paragraph: '5.3',
    content: '**5.3 Unilateral Suspension.** Provider reserves the right to suspend access to the Services immediately, without prior notice, if Provider determines in its sole discretion that continued access poses a security risk, violates this Agreement, or is necessary to protect Provider\'s systems or other clients. During any suspension, Client shall remain obligated to pay all applicable fees.',
    pageNumber: 1
  },
  {
    paragraph: 'Article 6',
    content: '## ARTICLE 6: PAYMENT TERMS',
    pageNumber: 2
  },
  {
    paragraph: '6.1',
    content: '**6.1 Invoice Payment.** All invoices are due within fifteen (15) days of issuance. Client shall pay all undisputed amounts in full without offset or deduction.',
    pageNumber: 2
  },
  {
    paragraph: '6.2',
    content: '**6.2 Late Payment Penalties.** Any payment not received within five (5) days of the due date shall be subject to a late fee of 25% of the outstanding balance, compounded monthly. In addition to late fees, Client shall pay interest on overdue amounts at the rate of 18% per annum or the maximum rate permitted by law, whichever is higher.',
    pageNumber: 2
  },
  {
    paragraph: '6.3',
    content: '**6.3 Collection Costs.** In the event Provider engages collection services or legal counsel to recover overdue amounts, Client shall reimburse Provider for all costs incurred, including but not limited to attorney fees, court costs, and collection agency fees. Such collection costs may total up to 40% of the outstanding balance.',
    pageNumber: 2
  },
  {
    paragraph: '6.4',
    content: '**6.4 Payment Disputes.** Client must notify Provider in writing of any disputed invoice amounts within forty-eight (48) hours of invoice receipt. Failure to dispute an invoice within this timeframe shall constitute Client\'s acceptance of all charges, and Client waives any right to subsequently challenge such charges.',
    pageNumber: 2
  },
  {
    paragraph: 'Article 7',
    content: '## ARTICLE 7: SERVICE LEVEL AGREEMENT',
    pageNumber: 3
  },
  {
    paragraph: '7.1',
    content: '**7.1 Service Availability.** Provider will make commercially reasonable efforts to maintain availability of the Services. However, Provider does not guarantee any specific uptime percentage or service availability metric. The Services are provided on an "as available" basis.',
    pageNumber: 3
  },
  {
    paragraph: '7.2',
    content: '**7.2 Support Response Times.** Provider will address support requests on a best-effort basis depending on resource availability and ticket priority as determined by Provider. Response times are not guaranteed and may vary based on the nature and complexity of the issue.',
    pageNumber: 3
  },
  {
    paragraph: '7.3',
    content: '**7.3 Maintenance Windows.** Provider reserves the right to perform scheduled maintenance and emergency maintenance on the Services at any time. Provider is not obligated to provide advance notice of maintenance windows, though Provider will attempt to minimize service disruptions when reasonably possible.',
    pageNumber: 3
  },
  {
    paragraph: '7.4',
    content: '**7.4 No Liability for Interruptions.** Provider shall not be liable for any service interruptions, downtime, or unavailability of the Services, regardless of cause, duration, frequency, or impact on Client\'s business operations. Client acknowledges that service interruptions may occur and accepts this risk.',
    pageNumber: 3
  },
  {
    paragraph: 'Article 8',
    content: '## ARTICLE 8: LIABILITY AND INDEMNIFICATION',
    pageNumber: 4
  },
  {
    paragraph: '8.1',
    content: '**8.1 Liability Cap.** Provider\'s total aggregate liability under this Agreement, whether based on contract, tort, negligence, strict liability, warranty, or any other legal theory, shall not exceed the lesser of (i) One Hundred Dollars ($100), or (ii) the total amount paid by Client to Provider in the one (1) month period immediately preceding the event giving rise to liability.',
    pageNumber: 4
  },
  {
    paragraph: '8.2',
    content: '**8.2 Client Indemnification.** Client agrees to indemnify, defend, and hold harmless Provider, its affiliates, officers, directors, employees, agents, and contractors from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney fees and court costs) arising from or related to: (a) Client\'s use of the Services; (b) Client\'s violation of this Agreement; (c) Client\'s violation of any applicable law or regulation; and (d) any negligent or wrongful act or omission by Provider in connection with the Services.',
    pageNumber: 4
  },
  {
    paragraph: '8.3',
    content: '**8.3 Survival.** The indemnification obligations set forth in Section 8.2 shall survive termination or expiration of this Agreement indefinitely and shall continue to bind Client, its successors, and assigns.',
    pageNumber: 4
  },
  {
    paragraph: '8.4',
    content: '**8.4 Waiver of Damages.** Client hereby waives and releases any and all claims for consequential, incidental, indirect, special, exemplary, or punitive damages arising from or related to this Agreement or the Services, even if Provider has been advised of the possibility of such damages.',
    pageNumber: 4
  },
  {
    paragraph: 'Article 9',
    content: '## ARTICLE 9: DATA SECURITY AND CONFIDENTIALITY',
    pageNumber: 5
  },
  {
    paragraph: '9.1',
    content: '**9.1 Security Measures.** Provider will implement reasonable security measures to protect Client Data, consistent with general industry standards. However, Provider makes no representations or warranties regarding the adequacy or effectiveness of such security measures.',
    pageNumber: 5
  },
  {
    paragraph: '9.2',
    content: '**9.2 Data Storage Location.** Client Data may be stored, processed, or transmitted through third-party facilities, servers, or cloud infrastructure located in jurisdictions not specified in this Agreement. Provider retains full discretion to determine data storage locations and may change such locations at any time without notice to Client.',
    pageNumber: 5
  },
  {
    paragraph: '9.3',
    content: '**9.3 Provider Access Rights.** Provider reserves the right to access, review, monitor, and analyze Client Data at any time for purposes including but not limited to: service improvement, troubleshooting, product development, training of machine learning models, security monitoring, compliance verification, and quality assurance.',
    pageNumber: 5
  },
  {
    paragraph: '9.4',
    content: '**9.4 No Security Warranties.** While Provider will maintain commercially reasonable confidentiality practices, Provider makes no warranties or guarantees regarding data security, integrity, or availability. Provider shall not be liable for any data breaches, unauthorized access, data corruption, data loss, or disclosure of Client Data, regardless of cause.',
    pageNumber: 5
  },
  {
    paragraph: '9.5',
    content: '**9.5 Client Backup Responsibility.** Client is solely and exclusively responsible for maintaining complete and current backups of all Client Data. Provider has no obligation to backup or archive Client Data and shall not be liable for any loss of data.',
    pageNumber: 5
  }
];

export const MOCK_REVIEWS: ContractReview[] = [
  {
    id: 'r1',
    paragraphId: 1,
    severity: 'safe',
    comment: 'STANDARD TERMINATION CLAUSE:\n\n✓ 30-day notice requirement is reasonable and industry-standard\n✓ Immediate termination for non-payment with 15-day cure period is fair\n✓ 10-day cure period for material breach provides adequate opportunity to remedy\n✓ Written notice requirement protects both parties\n\nThis clause provides balanced termination rights and follows best practices.',
    category: 'Termination - Standard'
  },
  {
    id: 'r2',
    paragraphId: 2,
    severity: 'safe',
    comment: 'REASONABLE POST-TERMINATION TERMS:\n\n✓ 30-day data retrieval period is adequate and standard\n✓ Payment through termination date is fair\n✓ Prorated refund provision protects client interests\n✓ 30-day refund timeframe is reasonable\n\nThis clause appropriately addresses post-termination obligations with balanced terms for both parties.',
    category: 'Termination - Effect'
  },
  {
    id: 'r3',
    paragraphId: 3,
    severity: 'high',
    comment: 'CRITICAL: UNILATERAL SUSPENSION CLAUSE:\n\n⚠ "Without prior notice" eliminates any warning or opportunity to address issues\n⚠ "Sole discretion" provides unlimited, unchallengeable authority\n⚠ Vague triggers: "security risk" and "necessary to protect" are undefined\n⚠ Client must continue paying fees during suspension period\n⚠ No service credits or compensation for suspension period\n\nRECOMMENDATION: Require 24-hour notice except for genuine emergencies, define suspension criteria specifically, provide service credits for suspension periods exceeding 24 hours, and include dispute resolution process.',
    category: 'Suspension Rights'
  },
  {
    id: 'r4',
    paragraphId: 5,
    severity: 'medium',
    comment: 'PAYMENT TERMS CONCERN:\n\n⚠ 15-day payment terms are shorter than industry standard (typically Net 30)\n⚠ "Without offset or deduction" prevents legitimate disputes from affecting payment\n\nRECOMMENDATION: Extend to Net 30 payment terms and allow withholding of disputed amounts pending resolution.',
    category: 'Payment Terms'
  },
  {
    id: 'r5',
    paragraphId: 6,
    severity: 'high',
    comment: 'EXTREME LATE PAYMENT PENALTIES:\n\n⚠ Only 5-day grace period before penalties apply is unreasonably short\n⚠ 25% late fee per incident is excessive (2.5x industry standard)\n⚠ Monthly compounding dramatically increases penalty burden\n⚠ Additional 18% annual interest on top of 25% fee creates effective APR exceeding 300%\n⚠ Penalties likely exceed usury limits in many jurisdictions\n\nRECOMMENDATION: Extend grace period to 15 days, cap late fee at 5% per month (60% APR), eliminate compounding, and choose between late fee OR interest, not both.',
    category: 'Late Penalties'
  },
  {
    id: 'r6',
    paragraphId: 7,
    severity: 'elevated',
    comment: 'EXCESSIVE COLLECTION COSTS:\n\n⚠ "All costs incurred" is unlimited and could exceed the debt itself\n⚠ 40% collection fee cap is extremely high (typical statutory limits: 15-25%)\n⚠ Includes attorney fees, court costs, AND collection agency fees cumulatively\n⚠ No requirement that costs be "reasonable" or proportionate\n\nRECOMMENDATION: Cap collection costs at 20% of outstanding balance or actual reasonable costs (whichever is less), require itemized billing, and allow only one type of collection cost (not cumulative).',
    category: 'Collection Costs'
  },
  {
    id: 'r7',
    paragraphId: 8,
    severity: 'elevated',
    comment: 'UNREASONABLE DISPUTE WINDOW:\n\n⚠ 48-hour dispute deadline is extremely short for invoice review\n⚠ Businesses often require approvals/review processes taking 5-10 days\n⚠ "Waives any right to subsequently challenge" eliminates fraud protection\n⚠ Written notice requirement may not allow sufficient time\n⚠ No provision for good-faith disputes raised after deadline\n\nRECOMMENDATION: Extend dispute period to 10 business days, allow disputes for billing errors discovered later, and require invoices to clearly state dispute procedure.',
    category: 'Dispute Process'
  },
  {
    id: 'r8',
    paragraphId: 10,
    severity: 'elevated',
    comment: 'WEAK SERVICE AVAILABILITY COMMITMENT:\n\n⚠ "Commercially reasonable efforts" is vague and unenforceable\n⚠ No specific uptime percentage (industry standard: 99.5%-99.9%)\n⚠ "As available" basis disclaims any reliability commitment\n⚠ No service level metrics or measurement methodology\n\nRECOMMENDATION: Define minimum uptime commitment (e.g., 99.5% monthly), establish measurement methodology, specify planned vs. unplanned downtime allowances, and provide service credits for SLA breaches.',
    category: 'SLA - Availability'
  },
  {
    id: 'r9',
    paragraphId: 11,
    severity: 'medium',
    comment: 'SUPPORT RESPONSE CONCERNS:\n\n⚠ "Best-effort basis" provides no accountability or guarantee\n⚠ Provider unilaterally determines priority levels\n⚠ "Resource availability" excuse allows indefinite delays\n⚠ No maximum response times even for critical issues\n\nRECOMMENDATION: Establish tiered support response times (e.g., Critical: 1 hour, High: 4 hours, Normal: 24 hours), define severity levels jointly, and provide escalation procedures.',
    category: 'SLA - Support'
  },
  {
    id: 'r10',
    paragraphId: 12,
    severity: 'elevated',
    comment: 'MAINTENANCE WITHOUT NOTICE:\n\n⚠ "At any time" allows maintenance during business-critical periods\n⚠ No advance notice requirement eliminates planning capability\n⚠ "Not obligated to provide advance notice" even for scheduled maintenance\n⚠ "Attempt to minimize disruptions" is non-binding aspirational language\n⚠ No distinction between emergency vs. planned maintenance\n\nRECOMMENDATION: Require 72-hour notice for scheduled maintenance, restrict maintenance to defined windows (e.g., weekends 2-6 AM), allow emergency maintenance without notice only for security or critical issues, and limit emergency maintenance duration.',
    category: 'SLA - Maintenance'
  },
  {
    id: 'r11',
    paragraphId: 13,
    severity: 'high',
    comment: 'COMPLETE LIABILITY WAIVER FOR INTERRUPTIONS:\n\n⚠ "Shall not be liable" eliminates all accountability\n⚠ "Regardless of cause" includes Provider negligence and intentional acts\n⚠ No distinction between Provider-caused vs. external issues\n⚠ "Impact on Client\'s business operations" clause ignores actual damages\n⚠ "Client acknowledges and accepts this risk" attempts to shift all risk\n\nRECOMMENDATION: Limit liability waiver to force majeure events, maintain liability for Provider negligence or willful misconduct, provide service credits for Provider-caused outages, and include business continuity commitments.',
    category: 'SLA - Liability'
  },
  {
    id: 'r12',
    paragraphId: 15,
    severity: 'high',
    comment: 'INADEQUATE LIABILITY CAP:\n\n⚠ $100 cap is symbolic and demonstrates bad faith\n⚠ "One month of fees" alternative could be minimal for new clients\n⚠ "Lesser of" means lowest amount always applies\n⚠ Cap applies to ALL legal theories including Provider negligence\n⚠ Cap includes direct damages, making recovery impossible\n⚠ No exceptions for gross negligence or willful misconduct\n\nRECOMMENDATION: Set minimum liability cap at 12 months of fees or $50,000 (whichever is greater), exclude gross negligence/willful misconduct from cap, and separate caps for different damage types.',
    category: 'Liability - Cap'
  },
  {
    id: 'r13',
    paragraphId: 16,
    severity: 'high',
    comment: 'EXTRAORDINARY CLIENT INDEMNIFICATION:\n\n⚠ Client indemnifies "negligent or wrongful act or omission by Provider" - this is highly unusual\n⚠ Client must defend Provider for Provider\'s own mistakes\n⚠ Indemnification includes Provider\'s violations of law\n⚠ No reciprocal indemnification by Provider\n⚠ "Any and all claims" is unlimited in scope\n⚠ Includes Provider\'s contractors and affiliates\n\nRECOMMENDATION: Limit client indemnification to claims arising from client\'s actions only, exclude Provider negligence entirely, make indemnification mutual, and cap indemnification at reasonable amount.',
    category: 'Indemnification'
  },
  {
    id: 'r14',
    paragraphId: 17,
    severity: 'elevated',
    comment: 'INDEFINITE INDEMNIFICATION SURVIVAL:\n\n⚠ Indemnification survives "indefinitely" with no time limit\n⚠ Extends to "successors and assigns" even after company sale\n⚠ Creates perpetual liability risk for client\n⚠ Standard survival periods are 1-3 years post-termination\n\nRECOMMENDATION: Limit survival to 2 years post-termination for most claims, 5 years for IP claims, and eliminate successor binding.',
    category: 'Survival'
  },
  {
    id: 'r15',
    paragraphId: 18,
    severity: 'elevated',
    comment: 'CONSEQUENTIAL DAMAGES WAIVER:\n\n⚠ Client waives ALL consequential damages including lost profits\n⚠ Applies "even if Provider has been advised" of potential damages\n⚠ No reciprocal waiver by Provider\n⚠ Prevents recovery for actual business losses caused by service failures\n⚠ May be unenforceable for gross negligence in some jurisdictions\n\nRECOMMENDATION: Make damages waiver mutual, allow consequential damages for gross negligence or willful misconduct, and establish reasonable alternative remedies (service credits).',
    category: 'Damages Waiver'
  },
  {
    id: 'r16',
    paragraphId: 20,
    severity: 'medium',
    comment: 'VAGUE SECURITY COMMITMENT:\n\n⚠ "Reasonable security measures" is undefined and subjective\n⚠ "General industry standards" is non-specific\n⚠ "No representations or warranties" disclaims the stated commitment\n⚠ No specific security controls listed (encryption, access controls, etc.)\n\nRECOMMENDATION: Specify security standards (SOC 2, ISO 27001), list required controls (encryption at rest/transit, MFA, logging), commit to security audits, and provide compliance certifications.',
    category: 'Data - Security'
  },
  {
    id: 'r17',
    paragraphId: 21,
    severity: 'elevated',
    comment: 'DATA STORAGE LOCATION CONCERNS:\n\n⚠ "Jurisdictions not specified" creates compliance risks (GDPR, data residency laws)\n⚠ Provider has "full discretion" without client input\n⚠ Can change locations "at any time without notice"\n⚠ May violate client\'s regulatory requirements\n⚠ No data sovereignty protections\n\nRECOMMENDATION: Specify data storage regions (e.g., US, EU), commit to providing list of data centers, require 30-day notice before location changes, and allow client to specify geographic restrictions.',
    category: 'Data - Location'
  },
  {
    id: 'r18',
    paragraphId: 22,
    severity: 'high',
    comment: 'UNLIMITED PROVIDER DATA ACCESS:\n\n⚠ "At any time" means continuous, unrestricted access\n⚠ "Service improvement" and "product development" are not legitimate business needs\n⚠ "Training of machine learning models" means client data used for AI training\n⚠ No consent, notification, or opt-out mechanism\n⚠ Violates data minimization principles\n⚠ May breach client\'s own privacy obligations\n\nRECOMMENDATION: Limit access to specific legitimate purposes only (troubleshooting, security), require logging of all access, provide access reports, allow client opt-out of non-essential uses, and prohibit ML training on client data.',
    category: 'Data - Access'
  },
  {
    id: 'r19',
    paragraphId: 23,
    severity: 'high',
    comment: 'COMPLETE SECURITY LIABILITY WAIVER:\n\n⚠ "No warranties or guarantees" contradicts security obligations\n⚠ "Shall not be liable" for breaches eliminates accountability\n⚠ "Regardless of cause" includes Provider negligence\n⚠ Covers data breaches, unauthorized access, corruption, and loss\n⚠ Likely unenforceable for negligent security practices\n\nRECOMMENDATION: Maintain liability for security breaches caused by Provider negligence, implement breach notification procedures (72 hours), provide breach response support, and maintain cybersecurity insurance.',
    category: 'Data - Breach Liability'
  },
  {
    id: 'r20',
    paragraphId: 24,
    severity: 'elevated',
    comment: 'BACKUP RESPONSIBILITY SHIFT:\n\n⚠ "Solely and exclusively" shifts all backup risk to client\n⚠ "No obligation to backup" is concerning for a service provider\n⚠ Provider should maintain system backups as standard practice\n⚠ "Shall not be liable for any loss" even if caused by Provider\n⚠ Creates operational burden on client\n\nRECOMMENDATION: Provider should maintain daily automated backups with 30-day retention, provide backup access/export tools, specify RTO/RPO commitments, and maintain liability for data loss due to Provider system failures.',
    category: 'Data - Backups'
  }
];

export const MOCK_RESULT: Result = {
  blocks: MOCK_BLOCKS,
  summary: "Critical risks identified across 5 articles: (1) Unilateral suspension without notice in Article 5; (2) Excessive penalties and 48-hour dispute window in Article 6; (3) No SLA guarantees with complete liability waiver in Article 7; (4) $100 liability cap with client indemnifying provider's negligence in Article 8; (5) Unlimited provider access to data with no breach liability in Article 9. Immediate renegotiation strongly recommended.",
  reviews: MOCK_REVIEWS
};
