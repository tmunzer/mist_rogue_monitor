import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';


import { ChartDataSets, ChartOptions, ChartType } from 'chart.js';
import { Color, Label } from 'ng2-charts';

export interface RogueElement {
  site_id: string,
  bssid: string,
  site_name: string,
  ssid: [{ ts: number, value: string }],
  channel: [{ ts: number, value: number }],
  times_heard: [{ ts: number, value: number }],
  ap_mac: [{ ts: number, value: string }],
  avg_rssi: [{ ts: number, value: number }],
  num_aps: [{ ts: number, value: number }],
  delta_x: [{ ts: number, value: number }],
  delta_y: [{ ts: number, value: number }],
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

export interface MapInfoElement {
  name: string,
  height: number,
  width: number,
  origin_x: number,
  origin_y: number,
  url: string
}

export interface PositionElement {
  x: number,
  y: number
}

@Component({
  selector: 'app-rogue',
  templateUrl: './rogue.component.html',
  styleUrls: ['../dashboard.component.css', './rogue.component.css']
})
export class RogueComponent implements OnInit {

  /////////////////////////
  // Constructor
  constructor(
    private _http: HttpClient,
    private _router: Router,
    private _snackBar: MatSnackBar,
    private _sanitizer: DomSanitizer,
    public dialogRef: MatDialogRef<RogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }



  @ViewChild('rogueDialog') rogueDialog!: ElementRef;

  colors = { "lan": "#0097a5", "honeypot": "#85b332", "spoof": "#e46b00", "others": "#aaaaaa" }

  /////////////////////////
  // RSSI chart
  public rssiChartLabels: Label[] = [];
  public rssiChartData: ChartDataSets[] = []
  public rssiChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: 'Average Received RSSI per day'
    },
    scales: {
      yAxes: [{
        ticks: {
          suggestedMin: -90,
          suggestedMax: -30
        }
      }]
    }
  };
  /////////////////////////
  // RSSI chart
  public thChartLabels: Label[] = [];
  public thChartData: ChartDataSets[] = []
  public thChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: true,
      text: '# times this AP has been heard per day'
    },
    scales: {
      yAxes: [{
        ticks: {
          precision: 0
        }
      }]
    }
  };

  /////////////////////////
  // charts
  public lineChartLegend = false;

  /////////////////////////
  // Others
  is_working: boolean = false;
  error_mess: string = "";
  sites = {};
  display: any = {
    lan: true,
    honeypot: true,
    spoof: true,
    others: false
  }

  image: any;
  map_info: MapInfoElement = {
    name: "",
    height: 0,
    width: 0,
    origin_x: 0,
    origin_y: 0,
    url: ""
  }

  rogue: RogueElement = {
    site_id: "",
    bssid: "",
    site_name: "",
    ssid: [{ ts: 0, value: "" }],
    channel: [{ ts: 0, value: 0 }],
    times_heard: [{ ts: 0, value: 0 }],
    ap_mac: [{ ts: 0, value: "" }],
    avg_rssi: [{ ts: 0, value: 0 }],
    num_aps: [{ ts: 0, value: 0 }],
    delta_x: [{ ts: 0, value: 0 }],
    delta_y: [{ ts: 0, value: 0 }],
    duration: 0,
    first_seen: 0,
    last_seend: 0,
    rogue_type: {
      lan: false,
      honeypot: false,
      spoof: false,
      others: false
    }
  }

  ap_position: PositionElement = {
    x: 0,
    y: 0
  }
  rogue_position: PositionElement = {
    x: 0,
    y: 0
  }
  scale: number = 1;
  drag: PositionElement = {
    x: 0,
    y: 0
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           INIT
  //////////////////////////////////////////////////////////////////////////////
  ngOnInit(): void {
    this.getRogueDetails();
  }

  parse_error(error: any): void {
    if (error.status == "401") {
      this._router.navigate(["/"]);
      this.dialogRef.close();
    } else {
      var message: string = "Unable to contact the server... Please try again later... "
      if (error.error && error.error.message) message = error.error.message
      else if (error.error) message = error.error
      this.open_snack_bar(message, "OK")
    }
  }

  getRogueDetails(): void {
    this.is_working = true;
    this._http.get<any>("/api/rogues/" + this.data.org_id + "/site/" + this.data.site_id + "/rogue/" + this.data.bssid).subscribe({
      next: data => {
        console.log(data);
        this.rogue = data.rogue;
        this.processLineChartData();
        this.ap_position = data.ap_position;
        this.map_info = data.map_info;
        this.getImage();
        this.processRoguePosition();
        this.is_working = false;
      },
      error: error => {
        this.is_working = false;
        this.parse_error(error);
      }
    })
  }

  processLineChartData(): void {
    //RSSI
    var data: number[] = []
    this.rogue.avg_rssi.forEach((rssi) => {
      this.rssiChartLabels.push(new Date(rssi.ts).toLocaleDateString().toString());
      data.push(rssi.value);
    })
    var dataset = {
      "label": this.rogue.bssid,
      "data": data,
      "borderColor": "#0097a5",
      "pointBackgroundColor": "#0097a5",
      "pointBorderColor": "#0097a5",
      "pointHoverBorderColor": "#0097a5",
      "pointHoverBackgroundColor": "#0097a5",
      "fill": false
    }
    this.rssiChartData.push(dataset);
    //Times heard
    var data: number[] = []
    this.rogue.times_heard.forEach((times_heard) => {
      this.thChartLabels.push(new Date(times_heard.ts).toLocaleDateString().toString());
      data.push(times_heard.value);
    })
    var dataset = {
      "label": this.rogue.bssid,
      "data": data,
      "borderColor": "#85b332",
      "pointBackgroundColor": "#85b332",
      "pointBorderColor": "#85b332",
      "pointHoverBorderColor": "#85b332",
      "pointHoverBackgroundColor": "#85b332",
      "fill": false
    }
    this.thChartData.push(dataset);
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           Process Rogue
  //////////////////////////////////////////////////////////////////////////////
  processRoguePosition(): void {
    this.rogue_position.x = (this.rogue.delta_x[this.rogue.delta_x.length - 1].value + this.ap_position.x);
    this.rogue_position.y = (this.rogue.delta_y[this.rogue.delta_y.length - 1].value + this.ap_position.y);
  }
  //////////////////////////////////////////////////////////////////////////////
  /////           Process MAP Image
  //////////////////////////////////////////////////////////////////////////////
  // Get image from server
  getImage(): void {
    if (this.map_info.url) {
      this._http.post(
        "/api/rogues/" + this.data.org_id + "/image",
        { url: this.map_info.url },
        { responseType: 'blob' as 'blob' }
      ).subscribe({
        next: data => {
          this.createImageFromBlob(data);
        }
      });
    }
  }
  // Create the image from the received data
  createImageFromBlob(image: Blob) {
    let reader = new FileReader();
    reader.addEventListener("load", () => {
      this.image = reader.result;
      this.centerImage();
    }, false);

    if (image) {
      reader.readAsDataURL(image);
    }
  }

  // Adapt the position offset to center the rogue on the screen
  centerImage(): void {
    if (this.image) {
      this.drag = {
        x: parseInt((((this.map_info.width/2)-this.rogue_position.x ) *this.scale ).toFixed()),
        y: parseInt((((this.map_info.height/2)- this.rogue_position.y) *this.scale).toFixed())
      }
    }
  }

  scale_in(): void {
    if (this.image) {
      this.scale = this.scale + 0.2;
      this.processRoguePosition();
    }
  }


  scale_out(): void {
    if (this.image) {
      if (this.scale > 0.2) {
        this.scale = parseFloat((this.scale - 0.2).toFixed(1));
        this.processRoguePosition();
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  /////           COMMON
  //////////////////////////////////////////////////////////////////////////////
  // SNACK BAR
  open_snack_bar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: "center",
      verticalPosition: "top",
    });
  }

  close() {
    this.dialogRef.close();
  }

}

import { Directive, Output, HostListener, EventEmitter } from '@angular/core';

@Directive({ selector: '[mouseWheel]' })
export class MouseWheelDirective {
  @Output() mouseWheelUp = new EventEmitter();
  @Output() mouseWheelDown = new EventEmitter();

  @HostListener('mousewheel', ['$event']) onMouseWheelChrome(event: any) {
    this.mouseWheelFunc(event);
  }

  @HostListener('DOMMouseScroll', ['$event']) onMouseWheelFirefox(event: any) {
    this.mouseWheelFunc(event);
  }

  @HostListener('onmousewheel', ['$event']) onMouseWheelIE(event: any) {
    this.mouseWheelFunc(event);
  }

  mouseWheelFunc(event: any) {
    var event = window.event || event; // old IE support
    var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    if (delta > 0) {
      this.mouseWheelUp.emit(event);
    } else if (delta < 0) {
      this.mouseWheelDown.emit(event);
    }
    // for IE
    event.returnValue = false;
    // for Chrome and Firefox
    if (event.preventDefault) {
      event.preventDefault();
    }
  }

}