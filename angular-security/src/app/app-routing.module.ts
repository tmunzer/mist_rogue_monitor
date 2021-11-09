import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component'
import { ConfigurationComponent } from './configuration/configuration.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrgSelectComponent } from './org-select/org-select.component';
//import { CustomizationComponent } from './customization/customization.component';
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'orgs', component: OrgSelectComponent },
  { path: 'orgs/:org_id/config', component: ConfigurationComponent },
  { path: 'orgs/:org_id/dashboard', component: DashboardComponent },
  //  { path: 'customization', component: CustomizationComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // redirect to `first-component`
  { path: '**', redirectTo: '/login' }, // redirect to `first-component`
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'corrected' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
