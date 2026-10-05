import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api-client.service';
import { AuthSession, AuthTokens, OtpRequestResult, OtpVerifyResult, RegisterBody } from '../dto';

/** `/auth/*` — sign-in by OTP or password, registration, refresh, logout. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  requestOtp(mobile: string): Observable<OtpRequestResult> {
    return this.api.post('/auth/otp/request', { mobile });
  }

  verifyOtp(mobile: string, code: string): Observable<OtpVerifyResult> {
    return this.api.post('/auth/otp/verify', { mobile, code });
  }

  register(body: RegisterBody): Observable<AuthSession> {
    return this.api.post('/auth/register', body);
  }

  login(mobile: string, password: string): Observable<AuthSession> {
    return this.api.post('/auth/login', { mobile, password });
  }

  refresh(refreshToken: string): Observable<AuthTokens> {
    return this.api.post('/auth/refresh', { refreshToken });
  }

  logout(refreshToken: string | null, allDevices = false): Observable<unknown> {
    return this.api.post('/auth/logout', allDevices ? { allDevices } : { refreshToken });
  }

  forgotPassword(mobile: string): Observable<OtpRequestResult> {
    return this.api.post('/auth/password/forgot', { mobile });
  }

  resetPassword(mobile: string, code: string, newPassword: string): Observable<unknown> {
    return this.api.post('/auth/password/reset', { mobile, code, newPassword });
  }
}
