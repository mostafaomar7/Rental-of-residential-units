import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { ApiDate, Page, PageQuery, Uuid } from '../api.types';
import {
  BankAccount,
  DecideResult,
  Earning,
  EarningsMeta,
  EarningsQuery,
  KpiDashboard,
  KpiPropertyRow,
  KpiQuery,
  PriceRecommendation,
  RecommendationDecision,
  RecommendationsMeta,
  RecommendationStatus,
  Statement,
} from '../dto';

/** Host portal: KPIs, smart-pricing recommendations, earnings, statements, payout account. */
@Injectable({ providedIn: 'root' })
export class HostInsightsApi {
  private readonly api = inject(ApiClient);

  // ---------- KPIs ----------

  kpis(query: KpiQuery = {}): Observable<KpiDashboard> {
    return this.api.get('/host/kpis', { ...query });
  }

  kpisByProperty(query: KpiQuery = {}): Observable<{ period: { from: ApiDate; to: ApiDate }; items: KpiPropertyRow[] }> {
    return this.api.get('/host/kpis/properties', { ...query });
  }

  /** CSV (opens in Excel). */
  kpisExport(query: KpiQuery = {}): Observable<Blob> {
    return this.api.blob('/host/kpis/export', { ...query });
  }

  // ---------- smart pricing ----------

  recommendations(
    query: PageQuery & { propertyId?: Uuid; unitId?: Uuid; status?: RecommendationStatus; from?: ApiDate; to?: ApiDate } = {},
  ): Observable<Page<PriceRecommendation, RecommendationsMeta>> {
    return this.api.page('/host/pricing/recommendations', { ...query });
  }

  /** Up to 200 decisions; per-item failures come back in `skipped`. */
  decide(items: RecommendationDecision[]): Observable<DecideResult> {
    return this.api.post('/host/pricing/recommendations/decide', { items });
  }

  // ---------- finance (owner only) ----------

  earnings(query: EarningsQuery = {}): Observable<Page<Earning, EarningsMeta>> {
    return this.api.page('/host/earnings', { ...query });
  }

  statements(query: PageQuery & { status?: 'ISSUED' | 'PAID'; period?: string } = {}): Observable<Page<Statement>> {
    return this.api.page('/host/statements', { ...query });
  }

  statement(id: Uuid): Observable<Statement> {
    return this.api.get(`/host/statements/${id}`);
  }

  statementCsv(id: Uuid): Observable<Blob> {
    return this.api.blob(`/host/statements/${id}/export`);
  }

  bankAccount(): Observable<BankAccount | null> {
    return this.api.get('/host/bank-account');
  }

  /** Changing the IBAN sends it back to verification. */
  saveBankAccount(body: { accountName: string; bankName: string; iban: string }): Observable<BankAccount> {
    return this.api.put('/host/bank-account', body);
  }
}
