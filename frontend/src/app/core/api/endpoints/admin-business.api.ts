import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { ApiDate, Page, PageQuery, Uuid } from '../api.types';
import {
  AdminPaymentsQuery,
  BankAccount,
  BankAccountStatus,
  Campaign,
  CampaignBody,
  CampaignPerformance,
  CampaignStatus,
  Earning,
  EarningsMeta,
  EarningsQuery,
  KpiDashboard,
  KpiPropertyRow,
  KpiQuery,
  Loyalty,
  Payment,
  Payouts,
  PointsTransaction,
  PointsTransactionType,
  PromoCode,
  PromoCodeBody,
  Refund,
  RefundStatus,
  Statement,
  Wallet,
  WalletTransaction,
} from '../dto';

/** Admin console: KPIs, money (payments, refunds, payouts, statements, wallets, loyalty), marketing. */
@Injectable({ providedIn: 'root' })
export class AdminBusinessApi {
  private readonly api = inject(ApiClient);

  // ---------- KPIs ----------

  kpis(query: KpiQuery = {}): Observable<KpiDashboard> {
    return this.api.get('/admin/kpis', { ...query });
  }

  kpisByProperty(query: KpiQuery = {}): Observable<{ period: { from: ApiDate; to: ApiDate }; items: KpiPropertyRow[] }> {
    return this.api.get('/admin/kpis/properties', { ...query });
  }

  kpisExport(query: KpiQuery = {}): Observable<Blob> {
    return this.api.blob('/admin/kpis/export', { ...query });
  }

  // ---------- payments & refunds ----------

  payments(query: AdminPaymentsQuery = {}): Observable<Page<Payment>> {
    return this.api.page('/admin/payments', { ...query });
  }

  refunds(query: PageQuery & { status?: RefundStatus } = {}): Observable<Page<Refund>> {
    return this.api.page('/admin/refunds', { ...query });
  }

  retryRefund(id: Uuid): Observable<Refund> {
    return this.api.post(`/admin/refunds/${id}/retry`);
  }

  // ---------- owner payouts ----------

  outstandingPayouts(): Observable<Payouts> {
    return this.api.get('/admin/payouts/outstanding');
  }

  earnings(query: EarningsQuery & { ownerId?: Uuid } = {}): Observable<Page<Earning, EarningsMeta>> {
    return this.api.page('/admin/earnings', { ...query });
  }

  /** Positive = credit, negative = deduction. */
  adjustEarnings(body: { ownerId: Uuid; propertyId?: Uuid; amount: number; reason: string }): Observable<Earning> {
    return this.api.post('/admin/earnings/adjustments', body);
  }

  statements(query: PageQuery & { status?: 'ISSUED' | 'PAID'; period?: string; ownerId?: Uuid } = {}): Observable<Page<Statement>> {
    return this.api.page('/admin/statements', { ...query });
  }

  statement(id: Uuid): Observable<Statement> {
    return this.api.get(`/admin/statements/${id}`);
  }

  statementCsv(id: Uuid): Observable<Blob> {
    return this.api.blob(`/admin/statements/${id}/export`);
  }

  /** Issues the monthly statements (default: last month). */
  generateStatements(period?: string): Observable<{ period: string; issued: number; statements: Statement[] }> {
    return this.api.post('/admin/statements/generate', period ? { period } : {});
  }

  payStatement(id: Uuid, bankReference: string): Observable<Statement> {
    return this.api.post(`/admin/statements/${id}/pay`, { bankReference });
  }

  bankAccounts(query: PageQuery & { status?: BankAccountStatus } = {}): Observable<Page<BankAccount>> {
    return this.api.page('/admin/bank-accounts', { ...query });
  }

  /** Full IBAN — the read is audited. */
  bankAccount(ownerId: Uuid): Observable<BankAccount> {
    return this.api.get(`/admin/bank-accounts/${ownerId}`);
  }

  reviewBankAccount(ownerId: Uuid, approve: boolean, reason?: string): Observable<BankAccount> {
    return this.api.post(`/admin/bank-accounts/${ownerId}/review`, reason ? { approve, reason } : { approve });
  }

  // ---------- wallets & loyalty ----------

  wallet(userId: Uuid): Observable<Wallet & { transactions?: WalletTransaction[] }> {
    return this.api.get(`/admin/wallets/${userId}`);
  }

  adjustWallet(userId: Uuid, amount: number, reason: string): Observable<WalletTransaction> {
    return this.api.post(`/admin/wallets/${userId}/adjustments`, { amount, reason });
  }

  loyalty(userId: Uuid): Observable<Loyalty> {
    return this.api.get(`/admin/loyalty/users/${userId}`);
  }

  loyaltyPoints(userId: Uuid, query: PageQuery & { type?: PointsTransactionType } = {}): Observable<Page<PointsTransaction>> {
    return this.api.page(`/admin/loyalty/users/${userId}/points`, { ...query });
  }

  adjustPoints(userId: Uuid, points: number, reason: string): Observable<PointsTransaction> {
    return this.api.post('/admin/loyalty/adjustments', { userId, points, reason });
  }

  // ---------- campaigns & promo codes ----------

  campaigns(query: PageQuery & { status?: CampaignStatus } = {}): Observable<Page<Campaign>> {
    return this.api.page('/admin/campaigns', { ...query });
  }

  campaign(id: Uuid): Observable<Campaign> {
    return this.api.get(`/admin/campaigns/${id}`);
  }

  createCampaign(body: CampaignBody): Observable<Campaign> {
    return this.api.post('/admin/campaigns', body);
  }

  updateCampaign(id: Uuid, body: CampaignBody): Observable<Campaign> {
    return this.api.patch(`/admin/campaigns/${id}`, body);
  }

  campaignPerformance(id: Uuid): Observable<CampaignPerformance> {
    return this.api.get(`/admin/campaigns/${id}/performance`);
  }

  promoCodes(query: PageQuery & { campaignId?: Uuid; active?: boolean; search?: string } = {}): Observable<Page<PromoCode>> {
    return this.api.page('/admin/promo-codes', { ...query });
  }

  promoCode(id: Uuid): Observable<PromoCode> {
    return this.api.get(`/admin/promo-codes/${id}`);
  }

  createPromoCode(body: PromoCodeBody & { code: string }): Observable<PromoCode> {
    return this.api.post('/admin/promo-codes', body);
  }

  updatePromoCode(id: Uuid, body: PromoCodeBody): Observable<PromoCode> {
    return this.api.patch(`/admin/promo-codes/${id}`, body);
  }
}
