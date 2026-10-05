import { TranslateService } from '@ngx-translate/core';
import { QuoteIssue } from '@api/dto';

const GENERIC_ISSUE = 'guest.quote.unavailable';

/** Translation keys for a quote's `issues[]`: the matching `errors.<CODE>`, else a generic text. */
export function quoteIssueKeys(issues: readonly QuoteIssue[], translate: TranslateService): string[] {
  const keys = issues.map((issue) => {
    const key = `errors.${typeof issue === 'string' ? issue : issue.code}`;
    return translate.instant(key) === key ? GENERIC_ISSUE : key;
  });
  return [...new Set(keys)];
}
