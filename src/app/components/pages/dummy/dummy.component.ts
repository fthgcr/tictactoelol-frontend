import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-dummy',
  templateUrl: './dummy.component.html',
  styleUrl: './dummy.component.scss'
})
export class DummyComponent implements OnInit{

  constructor(private route: ActivatedRoute, private router: Router){}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const gameId = params.get('gameId');
      this.router.navigate(['/game', gameId]);
    });
  }
}
