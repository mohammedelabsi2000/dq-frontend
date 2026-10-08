export interface NavItem {
  label: string
  icon: string
  to: string
  /** صلاحية واحدة على الأقل مطلوبة لإظهار العنصر */
  permission?: string | string[]
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    items: [{ label: 'لوحة التحكم', icon: 'pi pi-home', to: '/' }],
  },
  {
    label: 'الحلقات والطلاب',
    items: [
      { label: 'الحلقات', icon: 'pi pi-users', to: '/halaqas', permission: 'halaqas.show' },
      { label: 'الطلاب', icon: 'pi pi-graduation-cap', to: '/students', permission: 'students.show' },
      { label: 'استيراد الطلاب', icon: 'pi pi-file-import', to: '/students-import', permission: 'students.create' },
      {
        label: 'الإنجاز اليومي',
        icon: 'pi pi-book',
        to: '/daily-achievements',
        permission: 'daily_achievements.show',
      },
      {
        label: 'الشهادات',
        icon: 'pi pi-verified',
        to: '/certificates',
        permission: ['students.certificates.show', 'users.certificates.show'],
      },
    ],
  },
  {
    label: 'الخطط الدراسية',
    items: [
      { label: 'الخطط', icon: 'pi pi-sitemap', to: '/plans', permission: 'plans.show' },
      { label: 'المسارات', icon: 'pi pi-directions', to: '/tracks', permission: 'tracks.show' },
      { label: 'المساقات', icon: 'pi pi-bookmark', to: '/subjects', permission: 'subjects.show' },
      { label: 'الأجزاء المخصصة', icon: 'pi pi-clone', to: '/custom-juz', permission: 'custom_juzs.show' },
    ],
  },
  {
    label: 'الهيكل الإداري',
    items: [
      { label: 'الفروع', icon: 'pi pi-building', to: '/branches', permission: 'branches.show' },
      { label: 'المناطق', icon: 'pi pi-map', to: '/regions', permission: 'regions.show' },
      { label: 'المساجد', icon: 'pi pi-map-marker', to: '/mosques', permission: 'mosques.show' },
      { label: 'المراكز', icon: 'pi pi-warehouse', to: '/centers', permission: 'centers.show' },
    ],
  },
  {
    label: 'الكفالات والاعتماد',
    items: [
      { label: 'الكفلاء', icon: 'pi pi-heart', to: '/sponsors', permission: 'sponsors.show' },
      { label: 'طلبات الاعتماد', icon: 'pi pi-check-square', to: '/approvals', permission: 'approvals.show' },
    ],
  },
  {
    label: 'إدارة النظام',
    items: [
      { label: 'المستخدمون', icon: 'pi pi-user', to: '/users', permission: 'users.show' },
      { label: 'الأدوار والصلاحيات', icon: 'pi pi-shield', to: '/roles', permission: 'roles.show' },
      { label: 'الثوابت', icon: 'pi pi-list', to: '/constants', permission: 'constants.show' },
      { label: 'الإعدادات', icon: 'pi pi-cog', to: '/settings', permission: 'settings.show' },
    ],
  },
]
