import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { ErrorDialog } from './../common/error';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';


import { ChartDataSets, ChartOptions, ChartType } from 'chart.js';
import { Color, Label } from 'ng2-charts';

export interface Org {
  org_id: string;
  name: string;
  //role: string;
}


export interface RogueElement {
  site_id: string,
  bssid: string,
  site_name: string,
  ssid: string, 
  channel: number,
  avg_rssi: number,
  duration: number,
  first_seen: number,
  last_seend: number,
  rogue_type: {
    lan: boolean,
    honeypot: boolean,
    spoof: boolean,
    others: boolean
  }
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css', './../nav/nav.component.css']
})
export class DashboardComponent implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  /////////////////////////
  // Constructor
  constructor(private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _router: Router, private _activeroute: ActivatedRoute) { }
  colors = { "lan": "#0097a5", "honeypot": "#85b332", "spoof": "#e46b00", "others": "#aaaaaa" }

  /////////////////////////
  // Chart line
  public lineChartLabels: Label[] = [];
  public lineChartData: ChartDataSets[] = []
  public lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: 'Number of detected APs over time'
    }
  };

  public lineChartLegend = false;

  /////////////////////////
  // bar chart
  public barChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: '10 Top Sites'
    },
  };
  public barChartType: ChartType = 'bar';
  public barChartLegend = false;
  public barChartLabels: Label[] = [];
  public barChartData: ChartDataSets[] = [];

  /////////////////////////
  // table
  showInactive: boolean= false;
  displayedColumns: string[] = ['site_name', 'ap_mac', 'ssid', 'bssid', 'lan', 'honeypot', 'spoof', 'first_seen'];
  rogueDataSource: MatTableDataSource<RogueElement> = new MatTableDataSource();
  roguesDisplayed: RogueElement[] = [];
  pageIndex: number = 0
  pageSize: number = 25
  pageLength: number = 0
  pageSizeOptions: number[] = [5, 25, 50]


  filter_site: string = "";
  filter_site_list: string[] = [];
  filter_ssid: string = "";
  filter_bssid: string = "";

  /////////////////////////
  // Others
  org_id: string = "";
  orgs: Org[] = [];
  is_working: boolean = false;
  error_mess: string = "";
  sites = {};
  display: any = {
    lan: true,
    honeypot: true,
    spoof: true,
    others: false
  }

  
  stats = {
    lan: { now: 0, last_week: 0 },
    honeypot: { now: 0, last_week: 0 },
    spoof: { now: 0, last_week: 0 },
    others: { now: 0, last_week: 0 },
    rogues: [],
    labels: [],
    datasets: [
      {
        "label": "lan",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "pointBackgroundColor": this.colors["lan"],
        "pointBorderColor": this.colors["lan"],
        "pointHoverBorderColor": this.colors["lan"],
        "pointHoverBackgroundColor": this.colors["lan"]
      },
      {
        "label": "honeypot",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "pointBackgroundColor": this.colors["honeypot"],
        "pointBorderColor": this.colors["honeypot"],
        "pointHoverBorderColor": this.colors["honeypot"],
        "pointHoverBackgroundColor": this.colors["honeypot"]
      },
      {
        "label": "spoof",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "pointBackgroundColor": this.colors["spoof"],
        "pointBorderColor": this.colors["spoof"],
        "pointHoverBorderColor": this.colors["spoof"],
        "pointHoverBackgroundColor": this.colors["spoof"]
      },
      {
        "label": "others",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "pointBackgroundColor": this.colors["others"],
        "pointBorderColor": this.colors["others"],
        "pointHoverBorderColor": this.colors["others"],
        "pointHoverBackgroundColor": this.colors["others"]
      }
    ]
  }
  
  account = {
    last_rogue_process: 0,
    errors: 0,
    disabled: 0,
    configured: false,
    min_age: 1,
    sync_time_utc: {
      hours: 0,
      minutes: 0
    }
  }

  box_opened: Boolean = false;

  //////////////////////////////////////////////////////////////////////////////
  /////           INIT
  //////////////////////////////////////////////////////////////////////////////
  ngOnInit(): void {
    this._activeroute.params.subscribe(params => {
      this.org_id = params.org_id;
    });
    this.getAccount();
    this.getSites();
  }


  not_configured(): void {
    if (!this.box_opened) {
      this.box_opened = true;
      const dialogRef = this._dialog.open(ErrorDialog, {
        data: { title: "Account Not Configured", text: "Do you want to configure it now?" }
      })
      dialogRef.afterClosed().subscribe(result => {
        this.box_opened = false;
        if (result) this._router.navigate(["/orgs/" + this.org_id + "/config"])
      })
    }
  }

  parse_error(error: any): void {
    if (error.status == "401") this._router.navigate(["/"])
    else if (error.status == '404') this.not_configured()
    else {
      var message: string = "Unable to contact the server... Please try again later... "
      if (error.error && error.error.message) message = error.error.message
      else if (error.error) message = error.error
      this.open_snack_bar(message, "OK")
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           ACCOUNT
  //////////////////////////////////////////////////////////////////////////////
  parse_account(data: any): void {
    this.account = data;
  }
  getAccount(): void {
    this.is_working = true;
    this._http.get<any>("/api/dashboard/account/" + this.org_id).subscribe({
      next: data => {
        this.is_working = false;
        this.parse_account(data)
      },
      error: error => {
        this.is_working = false;
        this.parse_error(error)
      }
    })
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           SITES
  //////////////////////////////////////////////////////////////////////////////
  getSites(): void {
    this.is_working = true;
    this._http.get<any>("/api/dashboard/sites/" + this.org_id).subscribe({
      next: data => {
        this.sites = data;
        this.update_filter_sites()
        this.getStats();
      },
      error: error => {
        this.parse_error(error)
      }
    })
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           LINE CHART
  //////////////////////////////////////////////////////////////////////////////
  draw_line_chart(): void {
    this.lineChartData = []
    this.stats.datasets.forEach(dataset => {
      if (this.display[dataset.label]) {
        this.lineChartData.push(dataset)
      }
    })
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           SCATTER CHART
  //////////////////////////////////////////////////////////////////////////////
  draw_scatter_chart(): void {
    var sites: any = {};
    this.stats.rogues.forEach(rogue => {
      var site_id: string = rogue["site_id"];
      if (!sites[site_id]) {
        sites[site_id] = {
          site_name: this.sites[rogue["site_id"]],
          all: 0, lan: 0, honeypot: 0, spood: 0, others: 0
        }
      }
      if (this.display["lan"] && rogue["rogue_type"]["lan"]) {
        sites[site_id]["lan"] += 1;
      }
      if (this.display["honeypot"] && rogue["rogue_type"]["honeypot"]) {
        sites[site_id]["honeypot"] += 1;
      }
      if (this.display["spoof"] && rogue["rogue_type"]["spoof"]) {
        sites[site_id]["spoof"] += 1;
      }
      if (this.display["others"] && (!rogue["rogue_type"]["lan"] && !rogue["rogue_type"]["honeypot"] && !rogue["rogue_type"]["spoof"])) {
        sites[site_id]["others"] += 1;
      }
      sites[site_id]["all"] += 1;
    })

    var displayed_sites = Array();
    for (var site_id in sites) {
      if (displayed_sites.length < 10) {
        displayed_sites.push(sites[site_id])
      } else {
        var lower_site: any = {};
        displayed_sites.forEach(displayed_site => {
          if (lower_site == {} || lower_site['all'] < displayed_site['all']) {
            lower_site = displayed_site
          }
        })
        displayed_sites.slice(displayed_sites.indexOf(lower_site), 1)
        displayed_sites.push(sites[site_id])
      }
    }

    var data = [
      { data: Array(), label: 'LAN', stack: 'a', backgroundColor: this.colors["lan"], borderColor: this.colors["lan"], hoverBackgroundColor: this.colors["lan"], hoverBorderColor: this.colors["lan"] },
      { data: Array(), label: 'HONEYPOT', stack: 'a', backgroundColor: this.colors["honeypot"], borderColor: this.colors["honeypot"], hoverBackgroundColor: this.colors["honeypot"], hoverBorderColor: this.colors["honeypot"] },
      { data: Array(), label: 'SPOOF', stack: 'a', backgroundColor: this.colors["spoof"], borderColor: this.colors["spoof"], hoverBackgroundColor: this.colors["spoof"], hoverBorderColor: this.colors["spoof"] },
      { data: Array(), label: 'OTHERS', stack: 'a', backgroundColor: this.colors["others"], borderColor: this.colors["others"], hoverBackgroundColor: this.colors["others"], hoverBorderColor: this.colors["others"] }
    ];

    this.barChartLabels = [];
    displayed_sites.forEach(site => {
      this.barChartLabels.push(site["site_name"]);
      data[0]["data"].push(site["lan"]);
      data[1]["data"].push(site["honeypot"]);
      data[2]["data"].push(site["spoof"]);
      data[3]["data"].push(site["others"]);
    })
    this.barChartData = data;
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           TABLE
  //////////////////////////////////////////////////////////////////////////////
  clear_filter_site(){
    this.filter_site = "";
    this.apply_filter()
  }
  clear_filter_ssid(){
    this.filter_ssid = "";
    this.apply_filter()
  }
  clear_filter_bssid(){
    this.filter_bssid = "";
    this.apply_filter()
  }

  update_filter_sites() {
    var tmp = [];
    for (var site_id in this.sites) {
      var site_name: string = (this.sites as any)[site_id];
      if (this.filter_site == "" || site_name.toLocaleLowerCase().includes(this.filter_site.toLocaleLowerCase())) {
        tmp.push(site_name);
      }
    }
    tmp.sort();
    this.filter_site_list = tmp;
    this.apply_filter();
  }

  apply_filter() {
    this.roguesDisplayed = [];
    this.stats.rogues.forEach(rogue => {
      const rogue_element = (rogue as RogueElement);
      if (
         (this.showInactive || rogue_element.first_seen > 0)
        && (
          (this.display.lan && rogue_element.rogue_type.lan)
          || (this.display.honeypot && rogue_element.rogue_type.honeypot)
          || (this.display.spoof && rogue_element.rogue_type.spoof)
          || (this.display.others && rogue_element.rogue_type.others)
        )
        && (this.filter_site == "" || rogue_element.site_name.toLocaleLowerCase().includes(this.filter_site.toLocaleLowerCase())) 
        && (this.filter_ssid == "" || rogue_element.ssid.toLocaleLowerCase().includes(this.filter_ssid.toLocaleLowerCase())) 
        && (this.filter_bssid == "" || rogue_element.bssid.toLocaleLowerCase().includes(this.filter_bssid.toLocaleLowerCase())) 
      )
        this.roguesDisplayed.push(rogue)
    })

    this.rogueDataSource = new MatTableDataSource<RogueElement>(this.roguesDisplayed)
    this.rogueDataSource.paginator = this.paginator;
    this.rogueDataSource.sort = this.sort;
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           STATS
  //////////////////////////////////////////////////////////////////////////////
  parse_stats(data: any): void {
    this.stats = data;
    this.stats.labels.forEach(label => {
      this.lineChartLabels.push(new Date(label).toLocaleDateString().toString());
    })
    this.stats.rogues.forEach(rogue => {
      rogue["site_name"] = this.sites[rogue["site_id"]]
    })
    this.refresh_display();
  }
  getStats(): void {
    this.is_working = true;
    this._http.get<any>("/api/dashboard/stats/" + this.org_id).subscribe({
      next: data => {
        this.is_working = false;
        this.parse_stats(data);
      },
      error: error => {
        this.is_working = false;
        this.parse_error(error);
      }
    })
  }

  toggle_visibility(rogue_type: string): void {
    this.display[rogue_type] = !(this.display[rogue_type])
    this.refresh_display();
  }

  refresh_display(): void {
    this.draw_line_chart();
    this.draw_scatter_chart();
    this.apply_filter();

  }

  sort_site_autocomplete(a: any, b: any) {
    return a.value.toLowerCase() < b.value.toLowerCase() ? -1 : 1;
  }

  display_site_autocomplete(site_name: string): string {
    return site_name ? site_name : '';
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           DIALOG BOXES
  //////////////////////////////////////////////////////////////////////////////
  // ERROR
  open_error(title: string, text: string): void {
    const dialogRef = this._dialog.open(ErrorDialog, {
      data: { title: title, message: text }
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

  //////////////////////////////////////////////////////////////////////////////
  /////           BCK TO ORGS
  //////////////////////////////////////////////////////////////////////////////
  back_to_orgs(): void {
    this._router.navigate(["/orgs"])
  }
}
