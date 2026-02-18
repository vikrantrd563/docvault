import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MsalService } from '@azure/msal-angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div style='display:flex;justify-content:center;align-items:center;height:100vh;background:#f5f5f5'>
      <mat-card style='padding:48px;text-align:center'>
        <h1 style='color:#0078D4;margin-bottom:24px'>🔒 DocVault</h1>
        <p style='color:#666;margin-bottom:32px'>Secure Document Management</p>
        <button mat-raised-button color='primary' (click)='login()' style='font-size:16px;padding:12px 32px'>
          Sign in with Microsoft
        </button>
      </mat-card>
    </div>`
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