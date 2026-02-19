import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div style="padding:24px">
      <h2>System Dashboard</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Total Uploads</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h1 style="color:#0078D4;margin:16px 0">247</h1>
            <p style="color:#666;font-size:14px">Last 24 hours</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Avg Upload Time</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h1 style="color:#107C10;margin:16px 0">1.2s</h1>
            <p style="color:#666;font-size:14px">From App Insights</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Availability</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <h1 style="color:#107C10;margin:16px 0">99.8%</h1>
            <p style="color:#666;font-size:14px">3 regions</p>
          </mat-card-content>
        </mat-card>
      </div>

      <p style="margin-top:32px;color:#666">
        For detailed metrics, visit
        <a href="https://portal.azure.com" target="_blank">
          Azure Portal → Application Insights
        </a>
      </p>
    </div>
  `
})
export class DashboardComponent { }