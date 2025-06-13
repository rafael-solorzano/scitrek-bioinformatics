from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='student_activities_index'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('student_profile', views.student_profile, name='student_profile'),
    path('student_profile/inbox', views.inbox_view, name='inbox'),
    path('student_profile/bioinformatics-day-1', views.bioinformatics_d1_view, name='bioinformatics_day_1'),
    path('student_profile/bioinformatics-day-2', views.bioinformatics_d2_view, name='bioinformatics_day_2'),
    path('student_profile/bioinformatics-day-3', views.bioinformatics_d3_view, name='bioinformatics_day_3'),
    path('student_profile/bioinformatics-day-4', views.bioinformatics_d4_view, name='bioinformatics_day_4'),
    path('student_profile/bioinformatics-day-5', views.bioinformatics_d5_view, name='bioinformatics_day_5'),
    path('student_profile/pre_module', views.pre_mod_quiz, name='pre_module'),
    path('student_profile/post_module', views.post_mod_quiz, name='post_module'),
]
