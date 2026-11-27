import { Injectable, OnDestroy, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Menu } from 'src/app/core/constants/menu';
import { MenuItem, SubMenuItem } from 'src/app/core/models/menu.model';

@Injectable({
  providedIn: 'root',
})
export class MenuService implements OnDestroy {
  private readonly SIDEBAR_STORAGE_KEY = 'sidebar_open';
  private _showSidebar = signal(this.readSidebarState());
  private _showMobileMenu = signal(false);
  private _pagesMenu = signal<MenuItem[]>([]);
  private _subscription = new Subscription();

  private readSidebarState(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.SIDEBAR_STORAGE_KEY);
        if (saved !== null) return saved === 'true';
      }
    } catch {
      // ignore storage errors
    }
    return true;
  }

  private saveSidebarState(value: boolean): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.SIDEBAR_STORAGE_KEY, String(value));
      }
    } catch {
      // ignore storage errors
    }
  }

  constructor(private router: Router) {
    this._pagesMenu.set(Menu.pages);

    let sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const updated = this._pagesMenu().map((menu) => {
          let activeGroup = false;
          const items = menu.items.map((subMenu) => {
            const active = this.isActive(subMenu.route);
            if (active) activeGroup = true;
            if (subMenu.children) {
              this.expand(subMenu.children);
            }
            return {
              ...subMenu,
              expanded: active,
              active,
            };
          });
          return {
            ...menu,
            active: activeGroup,
            items,
          };
        });
        this._pagesMenu.set(updated);
      }
    });
    this._subscription.add(sub);
  }

  get showSideBar() {
    return this._showSidebar();
  }
  get showMobileMenu() {
    return this._showMobileMenu();
  }
  get pagesMenu() {
    return this._pagesMenu();
  }

  set showSideBar(value: boolean) {
    this._showSidebar.set(value);
    this.saveSidebarState(value);
  }
  set showMobileMenu(value: boolean) {
    this._showMobileMenu.set(value);
  }

  public toggleSidebar() {
    this.showSideBar = !this._showSidebar();
  }

  public toggleMenu(menu: SubMenuItem) {
    this.showSideBar = true;

    const updatedMenu = this._pagesMenu().map((menuGroup) => {
      return {
        ...menuGroup,
        items: menuGroup.items.map((item) => {
          return {
            ...item,
            expanded: item === menu ? !item.expanded : false,
          };
        }),
      };
    });

    this._pagesMenu.set(updatedMenu);
  }

  public toggleSubMenu(submenu: SubMenuItem) {
    submenu.expanded = !submenu.expanded;
  }

  private expand(items: Array<any>) {
    items.forEach((item) => {
      item.expanded = this.isActive(item.route);
      if (item.children) this.expand(item.children);
    });
  }

  public isActive(instruction: any): boolean {
    return this.router.isActive(this.router.createUrlTree([instruction]), {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }
}
