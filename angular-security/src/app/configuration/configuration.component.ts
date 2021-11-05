import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApitokenManualDialog } from './configuration.token.manual';

import { ErrorDialog } from './../common/error'
import { ConfirmDialog } from './configuration.confirm';

import { AuthConfigService } from "../services/auth.service";

export interface Site {
  id: string;
  name: string;
  //role: string;
}


@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent {

  constructor(private _router: Router, private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _auth_config_service: AuthConfigService) { }

  //COMMON
  privilege: string = "";
  account_created: boolean = false;
  //CONFIG
  config = {
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
    }
  }

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

  parse_config_response(data: any): void {
    if (data.account_created) this.account_created = data.account_created;
    if (data.privilege) this.privilege = data.privilege;
    if (data.config) this.config = data.config;
    this.set_site_lists();
  }


  get_config(): void {
    this.toggle_is_working("config", true)
    this._http.get<any>('/api/config/').subscribe({
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
    this._http.get<Site[]>('/api/sites/').subscribe({
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
    console.log(event)
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
    this._http.post<any>('/api/config/sites', this.config.sites).subscribe({
      next: data => {
        this.config.sites = data;
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
        this._http.delete("/api/account").subscribe({
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
    this._http.post<any>('/api/config/token', { scope: scope }).subscribe({
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
    this._http.post<any>('/api/config//token', { apitoken: apitoken }).subscribe({
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
        this._http.delete("/api/config//token").subscribe({
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
}