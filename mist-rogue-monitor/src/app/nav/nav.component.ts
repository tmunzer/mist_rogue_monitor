import { Component, ComponentFactoryResolver, Input, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent {
  @Input('current') current: string = "";

  constructor(private _router: Router, private _activeroute: ActivatedRoute) { }

  org_id: string = "";
  ngOnInit(): void {
    this._activeroute.params.subscribe(params => {
      this.org_id = params.org_id;
    });
  }
  nav(dest: string): void {
    this._router.navigate(["/orgs/" + this.org_id + "/" + dest])
  }
}
