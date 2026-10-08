import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setUnauthorizedHandler } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    permission?: string | string[]
    title?: string
  }
}

const page = (path: string, view: () => Promise<unknown>, title: string, permission?: string | string[]): RouteRecordRaw => ({
  path,
  component: view,
  props: true,
  meta: { title, permission },
})

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true, title: 'تسجيل الدخول' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      page('', () => import('@/views/DashboardView.vue'), 'لوحة التحكم'),
      page('profile', () => import('@/views/ProfileView.vue'), 'الملف الشخصي'),

      page('branches', () => import('@/views/structure/BranchesView.vue'), 'الفروع', 'branches.show'),
      page('regions', () => import('@/views/structure/RegionsView.vue'), 'المناطق', 'regions.show'),
      page('mosques', () => import('@/views/structure/MosquesView.vue'), 'المساجد', 'mosques.show'),
      page('centers', () => import('@/views/structure/CentersView.vue'), 'المراكز', 'centers.show'),

      page('halaqas', () => import('@/views/halaqas/HalaqasView.vue'), 'الحلقات', 'halaqas.show'),
      page('halaqas/:id', () => import('@/views/halaqas/HalaqaDetailView.vue'), 'تفاصيل الحلقة', 'halaqas.show'),

      page('students', () => import('@/views/students/StudentsView.vue'), 'الطلاب', 'students.show'),
      page('students-import', () => import('@/views/students/StudentsImportView.vue'), 'استيراد الطلاب', 'students.create'),
      page('students/:id', () => import('@/views/students/StudentDetailView.vue'), 'ملف الطالب', 'students.show'),

      page(
        'daily-achievements',
        () => import('@/views/achievements/DailyAchievementsView.vue'),
        'الإنجاز اليومي',
        'daily_achievements.show',
      ),
      page('certificates', () => import('@/views/certificates/CertificatesView.vue'), 'الشهادات', [
        'students.certificates.show',
        'users.certificates.show',
      ]),

      page('plans', () => import('@/views/plans/PlansView.vue'), 'الخطط', 'plans.show'),
      page('plans/:id', () => import('@/views/plans/PlanDetailView.vue'), 'تفاصيل الخطة', 'plans.show'),
      page('tracks', () => import('@/views/plans/TracksView.vue'), 'المسارات', 'tracks.show'),
      page('subjects', () => import('@/views/plans/SubjectsView.vue'), 'المساقات', 'subjects.show'),
      page('custom-juz', () => import('@/views/plans/CustomJuzView.vue'), 'الأجزاء المخصصة', 'custom_juzs.show'),

      page('sponsors', () => import('@/views/sponsors/SponsorsView.vue'), 'الكفلاء', 'sponsors.show'),
      page('sponsors/:id', () => import('@/views/sponsors/SponsorDetailView.vue'), 'تفاصيل الكفيل', 'sponsors.show'),
      page('approvals', () => import('@/views/approvals/ApprovalsView.vue'), 'طلبات الاعتماد', 'approvals.show'),

      page('users', () => import('@/views/admin/UsersView.vue'), 'المستخدمون', 'users.show'),
      page('roles', () => import('@/views/admin/RolesView.vue'), 'الأدوار والصلاحيات', 'roles.show'),
      page('constants', () => import('@/views/admin/ConstantsView.vue'), 'الثوابت', 'constants.show'),
      page('settings', () => import('@/views/admin/SettingsView.vue'), 'الإعدادات', 'settings.show'),

      page('forbidden', () => import('@/views/ForbiddenView.vue'), 'غير مصرح'),
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'الصفحة غير موجودة', guest: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.bootstrap()

  const isPublic = to.matched.some((record) => record.meta.guest)

  if (!auth.isAuthenticated && !isPublic) {
    return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }
  if (auth.isAuthenticated && to.path === '/login') {
    return { path: '/' }
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { path: '/forbidden' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | نظام التحفيظ` : 'نظام التحفيظ'
})

// عند انتهاء صلاحية التوكن (401) نعيد المستخدم لصفحة الدخول
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  auth.clear()
  if (router.currentRoute.value.path !== '/login') {
    void router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})

export default router
