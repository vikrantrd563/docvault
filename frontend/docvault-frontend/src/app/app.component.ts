import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, RouterLinkActive } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { EventMessage, EventType } from '@azure/msal-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    HttpClientModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="shell">
      <!-- SIDEBAR -->
      <aside class="sidebar" [class.collapsed]="collapsed">

        <!-- Brand -->
        <div class="sb-brand">
          <a class="brand-link" routerLink="/documents">
            <div class="brand-logo">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="10" fill="url(#grad)"/>
                <path d="M10 10h10l7 7v10H10V10z" fill="white" opacity="0.95"/>
                <path d="M20 10l7 7h-7V10z" fill="white" opacity="0.5"/>
                <path d="M14 21h9M14 25h6" stroke="#4ECDC4" stroke-width="1.8" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36">
                    <stop offset="0%" stop-color="#4ECDC4"/>
                    <stop offset="100%" stop-color="#2EC4B6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span class="brand-name" *ngIf="!collapsed">DocVault</span>
          </a>
          <button class="hamburger" (click)="collapsed = !collapsed" [matTooltip]="collapsed ? 'Expand' : 'Collapse'" matTooltipPosition="right">
            <mat-icon>{{ collapsed ? 'menu' : 'menu_open' }}</mat-icon>
          </button>
        </div>

        <!-- New Upload Button -->
        <div class="sb-upload">
          <button class="new-upload-btn" routerLink="/upload" [matTooltip]="collapsed ? 'Upload' : ''" matTooltipPosition="right">
            <mat-icon>add</mat-icon>
            <span *ngIf="!collapsed">New Upload</span>
          </button>
        </div>

        <!-- Nav -->
        <nav class="sb-nav">
          <a class="nav-item" routerLink="/documents" routerLinkActive="active"
             [matTooltip]="collapsed ? 'My Files' : ''" matTooltipPosition="right">
            <mat-icon>folder_open</mat-icon>
            <span *ngIf="!collapsed">My Files</span>
          </a>
          <a class="nav-item" routerLink="/starred" routerLinkActive="active"
             [matTooltip]="collapsed ? 'Starred' : ''" matTooltipPosition="right">
            <mat-icon>star_outline</mat-icon>
            <span *ngIf="!collapsed">Starred</span>
          </a>
          <a class="nav-item" routerLink="/recent" routerLinkActive="active"
             [matTooltip]="collapsed ? 'Recent' : ''" matTooltipPosition="right">
            <mat-icon>access_time</mat-icon>
            <span *ngIf="!collapsed">Recent</span>
          </a>
          <a class="nav-item" routerLink="/trash" routerLinkActive="active"
             [matTooltip]="collapsed ? 'Trash' : ''" matTooltipPosition="right">
            <mat-icon>delete_outline</mat-icon>
            <span *ngIf="!collapsed">Trash</span>
          </a>

          <div class="nav-divider" *ngIf="!collapsed"><span>Analytics</span></div>
          <div class="nav-divider-line" *ngIf="collapsed"></div>

          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active"
             [matTooltip]="collapsed ? 'Dashboard' : ''" matTooltipPosition="right">
            <mat-icon>bar_chart</mat-icon>
            <span *ngIf="!collapsed">Dashboard</span>
          </a>
        </nav>



        <!-- User -->
        <div class="sb-user" *ngIf="loggedIn">
          <div class="user-avatar">{{ initials }}</div>
          <div class="user-info" *ngIf="!collapsed">
            <p class="user-name">{{ displayName }}</p>
            <p class="user-email">{{ userEmail }}</p>
          </div>
          <button class="user-logout" *ngIf="!collapsed" (click)="logout()" matTooltip="Sign out">
            <mat-icon>logout</mat-icon>
          </button>
        </div>

      </aside>

      <!-- MAIN -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      --teal: #2EC4B6;
      --teal-light: #E8FAF9;
      --teal-mid: #4ECDC4;
      --coral: #FF6B6B;
      --coral-light: #FFF0F0;
      --text: #1A1A2E;
      --text-sub: #6B7280;
      --border: #E5E7EB;
      --bg: #F8FAFB;
      --white: #FFFFFF;
      --sb-width: 240px;
      font-family: 'Nunito', sans-serif;
    }

    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg);
      font-family: 'Nunito', sans-serif;
    }

    /* SIDEBAR */
    .sidebar {
      width: var(--sb-width);
      min-width: var(--sb-width);
      background: var(--white);
      border-right: 1.5px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: width 0.25s ease, min-width 0.25s ease;
      overflow: hidden;
      position: relative;
    }
    .sidebar.collapsed {
      width: 68px;
      min-width: 68px;
    }

    /* Brand */
    .sb-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 14px 8px;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .brand-logo svg {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      white-space: nowrap;
      letter-spacing: -0.5px;
    }
    .hamburger {
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-sub);
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .hamburger:hover { background: var(--bg); }
    .hamburger mat-icon { font-size: 20px; }

    /* Upload */
    .sb-upload { padding: 8px 12px; }
    .new-upload-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      background: var(--teal);
      color: white;
      border: none;
      border-radius: 50px;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(46, 196, 182, 0.35);
    }
    .new-upload-btn:hover {
      background: #25a99d;
      box-shadow: 0 4px 16px rgba(46, 196, 182, 0.45);
      transform: translateY(-1px);
    }
    .new-upload-btn mat-icon { font-size: 20px; }
    .sidebar.collapsed .new-upload-btn {
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
    }

    /* Nav */
    .sb-nav {
      flex: 1;
      padding: 4px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      text-decoration: none;
      color: var(--text-sub);
      font-size: 14px;
      font-weight: 600;
      transition: all 0.15s;
      white-space: nowrap;
      overflow: hidden;
    }
    .nav-item mat-icon { font-size: 20px; flex-shrink: 0; }
    .nav-item:hover { background: var(--bg); color: var(--text); }
    .nav-item.active {
      background: var(--teal-light);
      color: var(--teal);
    }
    .nav-item.active mat-icon { color: var(--teal); }

    .nav-divider {
      padding: 12px 12px 4px;
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .nav-divider-line {
      height: 1px;
      background: var(--border);
      margin: 8px 4px;
    }

    /* User */
    .sb-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border-top: 1px solid var(--border);
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--teal), var(--teal-mid));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .user-info { flex: 1; overflow: hidden; }
    .user-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-email {
      font-size: 11px;
      color: var(--text-sub);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-logout {
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 8px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-sub);
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .user-logout:hover { background: var(--coral-light); color: var(--coral); }
    .user-logout mat-icon { font-size: 18px; }

    /* Main */
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: var(--bg);
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  loggedIn = false;
  displayName = '';
  userEmail = '';
  initials = '';
  collapsed = false;
  private destroy$ = new Subject<void>();

  constructor(private auth: MsalService, private broadcast: MsalBroadcastService) {}

  async ngOnInit() {
    await this.auth.instance.initialize();
    this.broadcast.msalSubject$
      .pipe(filter((m: EventMessage) => m.eventType === EventType.LOGIN_SUCCESS), takeUntil(this.destroy$))
      .subscribe(() => this.checkAuth());
    this.checkAuth();
  }

  checkAuth() {
    const accounts = this.auth.instance.getAllAccounts();
    this.loggedIn = accounts.length > 0;
    if (this.loggedIn) {
      const acc = accounts[0];
      this.displayName = acc.name || '';
      this.userEmail = acc.username || '';
      const parts = this.displayName.trim().split(' ');
      this.initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
    }
  }

  logout() { this.auth.logoutRedirect(); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}