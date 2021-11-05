import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ErrorDialog } from './../common/error';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';


import { ChartDataSets, ChartOptions, ChartType, ChartData, ChartConfiguration } from 'chart.js';
import { Color, Label } from 'ng2-charts';

export interface Org {
  org_id: string;
  name: string;
  //role: string;
}

export interface RogueElement {
  site_id: string,
  site_name: string,
  ssid: string,
  bssid: string,
  channel: number,
  avg_rssi: number,
  duration: number,
  first_seen: number,
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
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  // Constructor
  constructor(private _http: HttpClient, public _dialog: MatDialog, private _snackBar: MatSnackBar, private _router: Router) { }

  //Chart line
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
  //Scatter chart
  public scatterChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: 'Detected APs repartition'
    },
  };
  public scatterChartType: ChartType = 'pie';
  public scatterChartLegend = false;

  public scatterChartData: ChartDataSets[] = [];


  // table

  displayedColumns: string[] = ['site_name', 'ssid', 'bssid', 'lan', 'honeypot', 'spoof', 'first_seen', 'channel', "avg_rssi"];
  rogueDataSource: MatTableDataSource<RogueElement> = new MatTableDataSource();
  roguesDisplayed: RogueElement[] = [];
  pageIndex: number = 0
  pageSize: number = 25
  pageLength: number = 0
  pageSizeOptions: number[] = [5, 25, 50]

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
    others: true
  }

  colors = { "lan": "#0097a5", "honeypot": "#85b332", "spoof": "#e46b00", "others": "#aaaaaa" }
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
        "backgroundColor": "rgba(0,0,0,0)",
        "pointBackgroundColor": this.colors["lan"],
        "borderColor": this.colors["lan"],
        "pointBorderColor": this.colors["lan"]
      },
      {
        "label": "honeypot",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "backgroundColor": "rgba(0,0,0,0)",
        "pointBackgroundColor": this.colors["honeypot"],
        "borderColor": this.colors["honeypot"],
        "pointBorderColor": this.colors["honeypot"]
      },
      {
        "label": "spoof",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "backgroundColor": "rgba(0,0,0,0)",
        "pointBackgroundColor": this.colors["spoof"],
        "borderColor": this.colors["spoof"],
        "pointBorderColor": this.colors["spoof"]
      },
      {
        "label": "others",
        "data": [0, 0, 0, 0, 0, 0, 0, 0],
        "backgroundColor": "rgba(0,0,0,0)",
        "pointBackgroundColor": this.colors["others"],
        "borderColor": this.colors["others"],
        "pointBorderColor": this.colors["others"]
      }
    ]
  }

  account = {
    last_rogue_process: 0,
    errors: 0,
    disabled: 0
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           INIT
  //////////////////////////////////////////////////////////////////////////////
  ngOnInit(): void {
    this.getAccount();
    this.getSites();
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
  /////           ACCOUNT
  //////////////////////////////////////////////////////////////////////////////
  parse_account(data: any): void {
    this.account = data
  }
  getAccount(): void {
    this.is_working = true;
    this._http.get<any>("/api/dashboard/account").subscribe({
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
    this._http.get<any>("/api/dashboard/sites").subscribe({
      next: data => {
        this.sites = data;
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
    this.scatterChartData = [];
    this.stats.rogues.forEach(rogue => {
      var color = "";
      if (this.display["lan"] && rogue["rogue_type"]["lan"]) color = this.colors["lan"];
      else if (this.display["honeypot"] && rogue["rogue_type"]["honeypot"]) color = this.colors["honeypot"];
      else if (this.display["spoof"] && rogue["rogue_type"]["spoof"]) color = this.colors["spoof"];
      else if (this.display["others"] && rogue["rogue_type"]["others"]) color = this.colors["others"];
      if (color) {
        this.scatterChartData.push({
          data: [
            { x: rogue["duration"], y: rogue["avg_rssi"], r: 5 },
          ],
          label: rogue["ssid"],
          backgroundColor: color
        })
      }
    })
    console.log(this.scatterChartData)
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           TABLE
  //////////////////////////////////////////////////////////////////////////////
  filter_table(): void {
    this.roguesDisplayed = [];
    this.stats.rogues.forEach(rogue => {
      if (
        (this.display["lan"] && rogue["rogue_type"]["lan"]) ||
        (this.display["honeypot"] && rogue["rogue_type"]["honeypot"]) ||
        (this.display["spoof"] && rogue["rogue_type"]["spoof"]) ||
        (this.display["others"] && rogue["rogue_type"]["others"])
      ) {
        this.roguesDisplayed.push(rogue);
      }
    })
    this.rogueDataSource = new MatTableDataSource<RogueElement>(this.roguesDisplayed)
    this.rogueDataSource.paginator = this.paginator;
    this.rogueDataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.rogueDataSource.filter = filterValue.trim().toLowerCase();

    if (this.rogueDataSource.paginator) {
      this.rogueDataSource.paginator.firstPage();
    }
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
    this._http.get<any>("/api/dashboard/stats").subscribe({
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
    this.filter_table();

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

}
