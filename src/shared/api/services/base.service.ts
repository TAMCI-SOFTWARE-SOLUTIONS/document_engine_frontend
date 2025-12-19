import {inject} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {throwError} from 'rxjs';
import {environment} from '../../../environments/environment';

export abstract class BaseService {
  protected httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  protected http: HttpClient = inject(HttpClient);

  protected basePath: string = `${environment.apiUrl}`;

  protected resourceEndpoint: string = '/resources';

  protected handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.log(`An error occurred: ${error.error.message}`);
    } else {
      console.log(`Backend returned code ${error.status}, body was: ${error.error}`);
    }
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

  protected resourcePath(): string {
    return `${this.basePath}${this.resourceEndpoint}`;
  }
}
