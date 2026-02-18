import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { EventMessage, EventType } from '@azure/msal-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HttpClientModule, MatToolbarModule,
    MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color='primary'>
      <span>🔒 DocVault</span>
      <span style='flex:1'></span>
      <span *ngIf='loggedIn' style='margin-right:16px'>{{userName}}</span>
      <button *ngIf='loggedIn' mat-icon-button (click)='logout()'>
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>
    <router-outlet></router-outlet>`
})
export class AppComponent implements OnInit, OnDestroy {
  loggedIn = false;
  userName = '';
  private destroy$ = new Subject<void>();

  constructor(
    private auth: MsalService,
    private broadcast: MsalBroadcastService) {}

  ngOnInit() {
    this.broadcast.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.checkAuth());
    this.checkAuth();
  }

  checkAuth() {
    const accounts = this.auth.instance.getAllAccounts();
    this.loggedIn = accounts.length > 0;
    if (this.loggedIn) this.userName = accounts[0].name || accounts[0].username;
  }

  logout() { this.auth.logoutRedirect(); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}