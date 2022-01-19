import { Pipe, PipeTransform } from '@angular/core';
import { WlanElement } from '../../services/wlans.service';


@Pipe({ name: 'wlanname' })

export class WlanPipe implements PipeTransform {
    transform(wlan_id: string, wlans: WlanElement[] = []) {
        var result = "";
        if (wlan_id) {
            result = "<unresolved>";
            wlans.forEach(wlan => {
                if (wlan.id == wlan_id) {
                    result = wlan.name;
                }
            })
        }
        return result
    }
}