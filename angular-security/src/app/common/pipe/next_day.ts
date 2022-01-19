import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'nextday' })

export class NextDayPipe implements PipeTransform {
    transform(last_sync: number = 0) {
        var date = new Date(last_sync);
        var result = new Date().setDate(date.getDate() + 1)
        
        return result;
    }
}