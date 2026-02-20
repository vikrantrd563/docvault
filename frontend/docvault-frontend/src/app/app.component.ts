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
      <!-- ═══ SIDEBAR ═══ -->
      <aside class="sidebar" [class.collapsed]="collapsed">
        <div class="sb-top">
          <!-- Logo -->
          <a class="brand" routerLink="/documents">
            <svg class="brand-icon" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#0061FE" />
              <path d="M11 11h12l6 6v13H11V11z" fill="white" />
              <path d="M23 11l6 6h-6V11z" fill="rgba(255,255,255,0.5)" />
              <path
                d="M15 22h10M15 26h7"
                stroke="#0061FE"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            <span class="brand-name" *ngIf="!collapsed">DocVault</span>
          </a>

          <!-- Upload CTA -->
          <button class="new-btn" *ngIf="!collapsed" routerLink="/upload">
            <mat-icon>add</mat-icon>
            New Upload
          </button>
          <button
            class="new-btn-slim"
            *ngIf="collapsed"
            routerLink="/upload"
            matTooltip="Upload"
            matTooltipPosition="right"
          >
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <!-- Nav links -->
        <nav class="nav">
          <a
            class="nl"
            routerLink="/documents"
            routerLinkActive="active"
            [matTooltip]="collapsed ? 'My Files' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>folder</mat-icon><span *ngIf="!collapsed">My Files</span>
          </a>
          <a
            class="nl"
            routerLink="/starred"
            routerLinkActive="active"
            [matTooltip]="collapsed ? 'Starred' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>star_outline</mat-icon><span *ngIf="!collapsed">Starred</span>
          </a>
          <a
            class="nl"
            routerLink="/recent"
            routerLinkActive="active"
            [matTooltip]="collapsed ? 'Recent' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>access_time</mat-icon><span *ngIf="!collapsed">Recent</span>
          </a>
          <a
            class="nl"
            routerLink="/trash"
            routerLinkActive="active"
            [matTooltip]="collapsed ? 'Trash' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>delete_outline</mat-icon><span *ngIf="!collapsed">Trash</span>
          </a>
          <div class="divider"></div>
          <a
            class="nl"
            routerLink="/dashboard"
            routerLinkActive="active"
            [matTooltip]="collapsed ? 'Dashboard' : ''"
            matTooltipPosition="right"
          >
            <mat-icon>bar_chart</mat-icon><span *ngIf="!collapsed">Dashboard</span>
          </a>
        </nav>

        <!-- Storage meter -->
        <div class="storage" *ngIf="!collapsed">
          <div class="storage-bar-bg">
            <div class="storage-bar-fill" [style.width.%]="38"></div>
          </div>
          <p class="storage-label">3.8 GB of 10 GB used</p>
          <button class="buy-btn">Get more storage</button>
        </div>

        <!-- Toggle -->
        <button
          class="toggle-btn"
          (click)="collapsed = !collapsed"
          [matTooltip]="collapsed ? 'Expand' : 'Collapse'"
          matTooltipPosition="right"
        >
          <mat-icon>{{ collapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
        </button>

        <!-- User -->
        <div class="user-row" *ngIf="loggedIn">
          <div class="av">{{ initials }}</div>
          <div class="uinfo" *ngIf="!collapsed">
            <p class="uname">{{ displayName }}</p>
            <p class="uemail">{{ userEmail }}</p>
          </div>
          <button class="logout-icon" *ngIf="!collapsed" (click)="logout()" matTooltip="Sign out">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </aside>

      <!-- ═══ MAIN ═══ -->
      <main class="main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host {
        --blue: #0061fe;
        --blue-soft: #ebf3ff;
        --text: #1c1c1e;
        --sub: #636366;
        --border: #e5e5ea;
        --bg: #f2f2f7;
        --white: #ffffff;
        --hover: #f2f2f7;
        --active-bg: #ebf3ff;
        --active-fg: #0061fe;
        --sb-w: 230px;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }

      .shell {
        display: flex;
        height: 100vh;
        overflow: hidden;
        background: var(--bg);
        font-family: 'Plus Jakarta Sans', sans-serif;
      }

      /* ─ SIDEBAR ─ */
      .sidebar {
        width: var(--sb-w);
        min-width: var(--sb-w);
        background: var(--white);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        transition:
          width 0.22s cubic-bezier(0.4, 0, 0.2, 1),
          min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        position: relative;
        z-index: 10;
      }
      .sidebar.collapsed {
        width: 60px;
        min-width: 60px;
      }

      .sb-top {
        padding: 16px 12px 8px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        margin-bottom: 14px;
      }
      .brand-icon {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
      }
      .brand-name {
        font-size: 17px;
        font-weight: 700;
        color: var(--text);
        white-space: nowrap;
        letter-spacing: -0.3px;
      }

      .new-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 14px;
        background: var(--blue);
        color: #fff;
        border: none;
        border-radius: 28px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition:
          background 0.15s,
          box-shadow 0.15s;
        white-space: nowrap;
      }
      .new-btn mat-icon {
        font-size: 20px;
      }
      .new-btn:hover {
        background: #004ed4;
        box-shadow: 0 2px 12px rgba(0, 97, 254, 0.3);
      }

      .new-btn-slim {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--blue);
        color: #fff;
        border: none;
        cursor: pointer;
        transition: background 0.15s;
        margin: 0 auto 4px;
      }
      .new-btn-slim:hover {
        background: #004ed4;
      }
      .new-btn-slim mat-icon {
        font-size: 20px;
      }

      /* ─ NAV ─ */
      .nav {
        flex: 1;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        overflow-y: auto;
      }
      .nl {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 10px;
        border-radius: 8px;
        text-decoration: none;
        color: var(--sub);
        font-size: 14px;
        font-weight: 500;
        transition:
          background 0.12s,
          color 0.12s;
        white-space: nowrap;
        overflow: hidden;
      }
      .nl mat-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      .nl:hover {
        background: var(--hover);
        color: var(--text);
      }
      .nl.active {
        background: var(--active-bg);
        color: var(--active-fg);
      }
      .nl.active mat-icon {
        color: var(--active-fg);
      }
      .divider {
        height: 1px;
        background: var(--border);
        margin: 6px 4px;
      }

      /* ─ STORAGE ─ */
      .storage {
        padding: 12px 14px;
        border-top: 1px solid var(--border);
      }
      .storage-bar-bg {
        height: 4px;
        background: #e5e5ea;
        border-radius: 4px;
        margin-bottom: 6px;
        overflow: hidden;
      }
      .storage-bar-fill {
        height: 100%;
        background: var(--blue);
        border-radius: 4px;
      }
      .storage-label {
        font-size: 11px;
        color: var(--sub);
        margin-bottom: 8px;
      }
      .buy-btn {
        width: 100%;
        padding: 6px 0;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: none;
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        color: var(--blue);
        cursor: pointer;
        transition: background 0.12s;
      }
      .buy-btn:hover {
        background: var(--blue-soft);
      }

      /* ─ TOGGLE ─ */
      .toggle-btn {
        position: absolute;
        bottom: 76px;
        right: -14px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--white);
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--sub);
        z-index: 20;
        transition:
          background 0.12s,
          color 0.12s;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      }
      .toggle-btn:hover {
        background: var(--hover);
        color: var(--text);
      }
      .toggle-btn mat-icon {
        font-size: 16px;
      }

      /* ─ USER ─ */
      .user-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 10px;
        border-top: 1px solid var(--border);
      }
      .av {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        flex-shrink: 0;
        background: linear-gradient(135deg, #0061fe, #4da3ff);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
      }
      .uinfo {
        flex: 1;
        overflow: hidden;
      }
      .uname {
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .uemail {
        font-size: 11px;
        color: var(--sub);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .logout-icon {
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 6px;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sub);
        transition: all 0.12s;
        flex-shrink: 0;
      }
      .logout-icon:hover {
        background: #ffe8e8;
        color: #d93025;
      }
      .logout-icon mat-icon {
        font-size: 18px;
      }

      /* ─ MAIN ─ */
      .main {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--bg);
      }
    `,
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  loggedIn = false;
  displayName = '';
  userEmail = '';
  initials = '';
  collapsed = false;
  private destroy$ = new Subject<void>();

  constructor(
    private auth: MsalService,
    private broadcast: MsalBroadcastService,
  ) {}

  async ngOnInit() {
    await this.auth.instance.initialize();
    this.broadcast.msalSubject$
      .pipe(
        filter((m: EventMessage) => m.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroy$),
      )
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

  logout() {
    this.auth.logoutRedirect();
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
