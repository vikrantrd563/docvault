import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="login-page">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="left-content">
          <div class="brand">
            <div class="brand-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="14" fill="white" opacity="0.15"/>
                <path d="M12 12h14l8 8v16H12V12z" fill="white" opacity="0.9"/>
                <path d="M26 12l8 8h-8V12z" fill="white" opacity="0.5"/>
                <path d="M17 27h14M17 32h9" stroke="white" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="brand-name">DocVault</span>
          </div>

          <div class="hero-text">
            <h1>Your files,<br/><span class="highlight">always safe.</span></h1>
            <p>Store, manage and access all your documents in one beautifully simple place.</p>
          </div>

          <div class="features">
            <div class="feature-item">
              <div class="feat-icon">📁</div>
              <span>Smart file organization</span>
            </div>
            <div class="feature-item">
              <div class="feat-icon">🔒</div>
              <span>Secure cloud storage</span>
            </div>
            <div class="feature-item">
              <div class="feat-icon">⚡</div>
              <span>Lightning fast search</span>
            </div>
          </div>
        </div>

        <!-- Decorative blobs -->
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <div class="login-card">
          <div class="login-icon">
            <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
              <rect width="48" height="48" rx="14" fill="url(#lg)"/>
              <path d="M12 12h14l8 8v16H12V12z" fill="white" opacity="0.9"/>
              <path d="M26 12l8 8h-8V12z" fill="white" opacity="0.5"/>
              <path d="M17 27h14M17 32h9" stroke="#2EC4B6" stroke-width="2" stroke-linecap="round"/>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48">
                  <stop stop-color="#2EC4B6"/>
                  <stop offset="1" stop-color="#4ECDC4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 class="login-title">Welcome back! 👋</h2>
          <p class="login-sub">Sign in with your Microsoft account to access your files</p>

          <button class="ms-btn" (click)="login()">
            <svg viewBox="0 0 21 21" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Continue with Microsoft
          </button>

          <div class="login-divider">
            <span>Secure login powered by Microsoft</span>
          </div>

          <p class="login-note">
            🛡️ Your data is encrypted and protected
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

    :host {
      --teal: #2EC4B6;
      --teal-mid: #4ECDC4;
      --coral: #FF6B6B;
      --text: #1A1A2E;
      --text-sub: #6B7280;
      font-family: 'Nunito', sans-serif;
    }

    .login-page {
      display: flex;
      height: 100vh;
      font-family: 'Nunito', sans-serif;
    }

    /* LEFT */
    .left-panel {
      flex: 1;
      background: linear-gradient(145deg, #2EC4B6 0%, #1A9E92 50%, #0F7A70 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .left-content {
      position: relative;
      z-index: 2;
      padding: 48px;
      max-width: 460px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 56px;
    }
    .brand-icon svg { width: 48px; height: 48px; }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: white;
      letter-spacing: -0.5px;
    }
    .hero-text h1 {
      font-size: 52px;
      font-weight: 800;
      color: white;
      line-height: 1.1;
      margin-bottom: 16px;
      letter-spacing: -1px;
    }
    .highlight { color: rgba(255,255,255,0.7); }
    .hero-text p {
      font-size: 17px;
      color: rgba(255,255,255,0.8);
      line-height: 1.6;
      margin-bottom: 40px;
    }
    .features { display: flex; flex-direction: column; gap: 14px; }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255,255,255,0.9);
      font-size: 15px;
      font-weight: 600;
    }
    .feat-icon {
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      flex-shrink: 0;
    }

    .blob {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
    }
    .blob-1 { width: 400px; height: 400px; top: -100px; right: -150px; }
    .blob-2 { width: 250px; height: 250px; bottom: -80px; left: -60px; }

    /* RIGHT */
    .right-panel {
      width: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F8FAFB;
      padding: 32px;
    }
    .login-card {
      width: 100%;
      max-width: 360px;
      background: white;
      border-radius: 24px;
      padding: 40px 36px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    .login-icon {
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
    }
    .login-title {
      font-size: 24px;
      font-weight: 800;
      color: #1A1A2E;
      margin-bottom: 8px;
    }
    .login-sub {
      font-size: 14px;
      color: #6B7280;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .ms-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 14px 24px;
      background: #1A1A2E;
      color: white;
      border: none;
      border-radius: 14px;
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 20px;
    }
    .ms-btn:hover {
      background: #2D2D44;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(26,26,46,0.25);
    }
    .login-divider {
      font-size: 12px;
      color: #9CA3AF;
      margin-bottom: 20px;
      padding: 0 8px;
    }
    .login-note {
      font-size: 13px;
      color: #6B7280;
      background: #F0FDF4;
      border-radius: 10px;
      padding: 10px 14px;
      border: 1px solid #BBF7D0;
    }

    @media (max-width: 768px) {
      .login-page { flex-direction: column; }
      .left-panel { flex: none; height: 40vh; }
      .right-panel { width: 100%; flex: 1; }
      .hero-text h1 { font-size: 32px; }
    }
  `]
})
export class LoginComponent implements OnInit {
  constructor(private auth: MsalService, private router: Router) {}

  ngOnInit() {
    if (this.auth.instance.getAllAccounts().length > 0) {
      this.router.navigate(['/']);
    }
  }

  login() { this.auth.loginRedirect(); }
}