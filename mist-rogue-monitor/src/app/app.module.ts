import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ErrorDialog } from './common/error';
import { LoginComponent } from './login/login.component';
import { TwoFactorDialog } from './login/login-2FA';
import { OrgSelectComponent } from './org-select/org-select.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { ApitokenManualDialog } from './configuration/configuration.token.manual';
import { ConfirmDialog } from './configuration/configuration.confirm';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RogueComponent, MouseWheelDirective } from './dashboard/rogue/rogue.component';
import { NavComponent } from './nav/nav.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ChartsModule } from 'ng2-charts';
import {DragDropModule} from '@angular/cdk/drag-drop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {NgxMatTimepickerModule} from 'ngx-mat-timepicker';


import { NextDayPipe } from './common/pipe/next_day'
import { TsArrayPipe } from './common/pipe/ts_array_pipe'

@NgModule({
  declarations: [
    AppComponent,
    ErrorDialog,
    LoginComponent, TwoFactorDialog,
    ConfigurationComponent, ConfirmDialog,
    DashboardComponent,
    RogueComponent,
    ApitokenManualDialog,
    OrgSelectComponent,
    NavComponent,
    NextDayPipe,
    TsArrayPipe,
    MouseWheelDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    DragDropModule,
    FlexLayoutModule,
    FormsModule,
    ChartsModule,
    HttpClientModule,
    HttpClientJsonpModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    NgxMatTimepickerModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
