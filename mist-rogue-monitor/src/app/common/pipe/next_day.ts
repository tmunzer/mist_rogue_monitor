import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'nextday' })

export class NextDayPipe implements PipeTransform {
    transform(account: any) {
        var now = new Date();
        var date = new Date(account.last_rogue_process);
        date.setUTCHours(account.sync_time_utc.hours);
        date.setUTCMinutes(account.sync_time_utc.minutes);
        if (date < now) {
            date.setDate(date.getDate() + 1);
        }
        return date;
    }
}