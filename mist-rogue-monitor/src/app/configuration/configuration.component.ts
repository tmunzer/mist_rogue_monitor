import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApitokenManualDialog } from './configuration.token.manual';

import { ErrorDialog } from './../common/error'
import { ConfirmDialog } from './configuration.confirm';

import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';


export interface Site {
  id: string;
  name: string;
  //role: string;
}


@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css', './../nav/nav.component.css']
})
export class ConfigurationComponent {

  constructor(private _router: Router, private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _activeroute: ActivatedRoute) { }

  //COMMON
  privilege: string = "";
  account_created: boolean = false;
  //CONFIG
  config = {
    sync_time: "",
    sync_time_utc: {
      hours: -1,
      minutes: -1
    },
    sites: {
      site_ids: Array(),
      all_sites: false,
      configured: false
    },
    token: {
      configured: false,
      created_by: "",
      scope: "",
      can_delete: false,
      auto_mode: true
    },
    alert: {
      configured: false,
      enabled: false,
      neighbors: false,
      to_emails: Array(),
      min_age: 1
    }
  }

  // CHIPS
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;


  org_id: string = "";
  sites: Site[] = [];

  filter_available_sites: String = "";
  available_sites: Site[] = [];
  available_sites_filtered: Site[] = [];
  available_sites_all: boolean = false;
  available_sites_selected: Site[] = [];

  filter_monitored_sites: String = "";
  monitored_sites: Site[] = [];
  monitored_sites_filtered: Site[] = [];
  monitored_sites_all: boolean = false;
  monitored_sites_selected: Site[] = [];

  is_working = false;
  is_working_config = false;
  is_working_sites = false;

  test: boolean = false;

  ngOnInit(): void {
    this._activeroute.params.subscribe(params => {
      this.org_id = params.org_id;
    });
    //this.config.sites.sync_time = "0";
    this.get_config();
    this.get_sites();
  }

  parse_error(error: any): void {
    if (error.status == "401") {
      this._router.navigate(["/"])
    } else {
      var message: string = "Unable to contact the server... Please try again later... "
      if (error.error && error.error.message) message = error.error.message
      else if (error.error) message = error.error
      this.open_snack_bar(message, "OK")
    }
  }


  //////////////////////////////////////////////////////////////////////////////
  /////           WORKING INDICATOR
  //////////////////////////////////////////////////////////////////////////////
  toggle_is_working(part: string, value: boolean): void {
    if (part == "config") this.is_working_config = value;
    if (part == "sites") this.is_working_config = value;
    this.is_working = this.is_working_config && this.is_working_sites;
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           CONFIG
  //////////////////////////////////////////////////////////////////////////////
  set_default_sync_time(): void {
    if (!this.config.sync_time) {
      var sync_time = new Date();
      var min = sync_time.getMinutes()
      var tmp = parseInt((min / 10).toFixed()) * 10
      if ((min / 5) % 2 < 1) {
        min = tmp + 5
      } else {
        min = tmp 
      }
      if (min < 60) {
        sync_time.setMinutes(min);
      } else {
        sync_time.setHours(sync_time.getHours() + 1)
        sync_time.setMinutes(min - 60)
      }
      this.config.sync_time = sync_time.getHours() + ":" + sync_time.getMinutes();
      this.config.sync_time_utc = {
        hours: sync_time.getUTCHours(),
        minutes: sync_time.getUTCMinutes()
      }
    }
  }

  set_sync_time_from_utc() {
    var hours = this.config.sync_time_utc.hours
    var minutes = this.config.sync_time_utc.minutes
    var sync_time = new Date()
    sync_time.setUTCHours(parseInt(hours.toString()))
    sync_time.setUTCMinutes(parseInt(minutes.toString()))
    var res = sync_time.getHours() + ":" + sync_time.getMinutes();
    this.config.sync_time = res;

  }

  get_sync_time_to_utc(): any {
    var hours = this.config.sync_time.split(":")[0]
    var minutes = this.config.sync_time.split(":")[1]
    var sync_time_utc = new Date()
    sync_time_utc.setHours(parseInt(hours))
    sync_time_utc.setMinutes(parseInt(minutes))
    var res = {hours: sync_time_utc.getUTCHours(), minutes: sync_time_utc.getUTCMinutes()}
    return res
  }

  parse_config_response(data: any): void {
    if (data.account_created) this.account_created = data.account_created;
    if (data.privilege) this.privilege = data.privilege;
    if (data.config) this.config = data.config;
    if ("hours" in this.config.sync_time_utc && "minutes" in this.config.sync_time_utc) {
      this.set_sync_time_from_utc();
    } else {
      this.set_default_sync_time();
    }
    this.set_site_lists();
  }


  get_config(): void {
    this.toggle_is_working("config", true)
    this._http.get<any>('/api/config/' + this.org_id).subscribe({
      next: data => {
        this.parse_config_response(data);
        this.toggle_is_working("config", false)
      },
      error: error => {
        this.parse_error(error);
        this.toggle_is_working("config", false)
      }
    })
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           SITES
  //////////////////////////////////////////////////////////////////////////////

  set_site_lists(): void {
    this.available_sites = [];
    this.monitored_sites = [];
    if (this.sites.length > 0) {
      this.sites.forEach(site => {
        const site_id: string = site["id"]
        if (this.config.sites.site_ids.indexOf(site_id) > 0) {
          this.monitored_sites.push(site)
        } else {
          this.available_sites.push(site)
        }
      })
    }
    this.available_sites_filtered = this.available_sites;
    this.monitored_sites_filtered = this.monitored_sites;
  }

  parse_sites_response(data: Site[]): void {
    if (data) this.sites = data;
    this.set_site_lists();
  }

  get_sites(): void {
    this.toggle_is_working("sites", true)
    this._http.get<Site[]>('/api/sites/' + this.org_id).subscribe({
      next: data => {
        this.parse_sites_response(data);
        this.toggle_is_working("sites", false)
      },
      error: error => {
        this.toggle_is_working("sites", false)
        this.parse_error(error);
      }
    })
  }

  filter_sites(event: String, list: String) {
    let tmp_sites: Site[] = [];
    let tmp_sites_filtered: Site[];
    if (list == "avalable") {
      tmp_sites = this.available_sites;
      tmp_sites_filtered = this.available_sites_filtered;
    } else if (list == "monitored") {
      tmp_sites = this.monitored_sites;
      tmp_sites_filtered = this.monitored_sites_filtered;
    }
    tmp_sites.forEach(site => {
      if (site.name.toLocaleLowerCase().indexOf(event.toLocaleLowerCase()) >= 0) {
        tmp_sites_filtered.push(site)
      }
    })
  }

  select_site(site: Site, list: String) {
    if (list == "available") {
      if (this.available_sites_selected.indexOf(site) >= 0) {
        this.available_sites_selected.splice(this.available_sites_selected.indexOf(site), 1);
        this.available_sites_all = false;
      } else {
        this.available_sites_selected.push(site)
      }
    } else if (list == "monitored") {
      if (this.monitored_sites_selected.indexOf(site) >= 0) {
        this.monitored_sites_selected.splice(this.monitored_sites_selected.indexOf(site), 1);
        this.monitored_sites_all = false;
      } else {
        this.monitored_sites_selected.push(site)
      }
    }
  }
  select_all_sites(all: boolean, list: String) {
    if (list == "available") {
      this.available_sites_all = all;
      if (all) {
        this.available_sites_filtered.forEach(site => {
          this.available_sites_selected.push(site)
        })
      }
    } else if (list == "monitored") {
      this.monitored_sites_all = all;
      if (all) {
        this.monitored_sites_filtered.forEach(site => {
          this.monitored_sites_selected.push(site)
        })
      }
    }
  }

  add_monitored_sites(): void {
    this.available_sites_selected.forEach(site => {
      this.monitored_sites.push(site)
      this.available_sites.splice(this.available_sites.indexOf(site), 1)
    })
    this.available_sites_selected = [];
    this.available_sites_filtered = this.available_sites;
    this.monitored_sites_filtered = this.monitored_sites;
    this.available_sites_all = false;
    this.monitored_sites_all = false;
  }
  remove_monitored_sites(): void {
    this.monitored_sites_selected.forEach(site => {
      this.available_sites.push(site)
      this.monitored_sites.splice(this.monitored_sites.indexOf(site), 1)
    })
    this.monitored_sites_selected = [];
    this.available_sites_filtered = this.available_sites;
    this.monitored_sites_filtered = this.monitored_sites;
    this.available_sites_all = false;
    this.monitored_sites_all = false;
  }

  save_sites() {
    if (this.monitored_sites.length > 0) {
      this.config.sites.site_ids = [];
      this.monitored_sites.forEach(site => {
        this.config.sites.site_ids.push(site.id)
      })
    }
    this.config.sites.configured = true;
    this.config.sync_time_utc = this.get_sync_time_to_utc();
    this._http.post<any>('/api/config/sites/' + this.org_id, {sync_time_utc: this.config.sync_time_utc, sites: this.config.sites}).subscribe({
      next: data => {
        this.config.sites = data.sites;
        this.config.sync_time_utc = data.sync_time_utc;
        this.set_sync_time_from_utc();
        this.open_snack_bar("Monitored sites configured.", "Ok")
      },
      error: error => {
        this.parse_error(error)
      }
    })
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           DELETE
  //////////////////////////////////////////////////////////////////////////////
  delete_account(): void {
    this.is_working = true;
    const dialogRef = this._dialog.open(ConfirmDialog, { data: { title: "Delete Account", message: "This action will delete all the current configuration." } });
    dialogRef.afterClosed().subscribe(result => {
      this.is_working = true
      if (result) {
        this._http.delete("/api/account/" + this.org_id).subscribe({
          next: data => {
            this.is_working = false
            this.open_snack_bar("Account deleted.", "Ok")
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          },
          error: error => this.parse_error(error)
        })
      }
    })
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           TOKEN
  //////////////////////////////////////////////////////////////////////////////
  generate_token(scope: string): void {
    this.config.token.configured = false;
    this.config.token.auto_mode = true;
    this.is_working = true;
    this._http.post<any>('/api/config/token/' + this.org_id, { scope: scope }).subscribe({
      next: data => {
        this.config.token.configured = true;
        this.config.token.auto_mode = true;
        this.config.token.can_delete = true;
        this.account_created = true;
        this.is_working = false
        this.open_snack_bar("New API Token created.", "Ok")
      },
      error: error => {
        this.parse_error(error)
      }
    })
  }

  save_manual_token(apitoken: string): void {
    this.config.token.configured = false;
    this.config.token.auto_mode = true;
    this.is_working = true;
    this._http.post<any>('/api/config/token/' + this.org_id, { apitoken: apitoken }).subscribe({
      next: data => {
        this.config.token.configured = true;
        this.config.token.auto_mode = false;
        this.is_working = false
        this.open_snack_bar("New API Token created.", "Ok")
      },
      error: error => {
        this.parse_error(error)
      }
    })
  }

  delete_token(): void {
    this.is_working = true;
    const dialogRef = this._dialog.open(ConfirmDialog, { data: { title: "Delete Token", message: "This action will delete the API Token from the Mist Cloud." } });
    dialogRef.afterClosed().subscribe(result => {
      this.is_working = true
      if (result) {
        this._http.delete("/api/config/token/" + this.org_id).subscribe({
          next: data => {
            this.is_working = false
            this.config.token.configured = false;
            this.config.token.auto_mode = true;
            this.open_snack_bar("API Token deleted.", "Ok")
          },
          error: error => this.parse_error(error)
        })
      }
    })
  }


  //////////////////////////////////////////////////////////////////////////////
  /////           ALERT
  //////////////////////////////////////////////////////////////////////////////

  add_email(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    // Add our fruit
    if (value) {
      this.config.alert.to_emails.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove_email(email: string): void {
    const index = this.config.alert.to_emails.indexOf(email);

    if (index >= 0) {
      this.config.alert.to_emails.splice(index, 1);
    }
  }

  save_alert(): void {
    this._http.post<any>('/api/config/alerts/' + this.org_id, this.config.alert).subscribe({
      next: data => {
        this.config.alert = data;
        this.open_snack_bar("Email Alert configured.", "Ok")
      },
      error: error => {
        this.parse_error(error)
      }
    })
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           DIALOG BOXES
  //////////////////////////////////////////////////////////////////////////////
  // ERROR
  open_error(message: string): void {
    const dialogRef = this._dialog.open(ErrorDialog, {
      data: message
    });
  }

  // SNACK BAR
  open_snack_bar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: "center",
      verticalPosition: "top",
    });
  }

  //// DIALOG BOX ////
  open_apitoken_manual(): void {
    const dialogRef = this._dialog.open(ApitokenManualDialog, {});
    dialogRef.afterClosed().subscribe(result => {
      if (result) { this.save_manual_token(result) }
    });
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           BCK TO ORGS
  //////////////////////////////////////////////////////////////////////////////
  back_to_orgs(): void {
    this._router.navigate(["/orgs"])
  }
}