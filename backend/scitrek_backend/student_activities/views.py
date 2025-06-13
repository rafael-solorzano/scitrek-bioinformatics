from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from .forms import CustomStudentSignupForm, CustomStudentAuthenticationForm

def index(request):
    """Display the Student Activities Home Page"""
    return render(request, "student_activities/index.html", {})

def login_view(request):
    """Student Login/Sign-Up Page"""
    if request.method == 'POST':
        if 'signup_submit' in request.POST:
            signup_form = CustomStudentSignupForm(request.POST)
            login_form = CustomStudentAuthenticationForm()
            if signup_form.is_valid():
                user = signup_form.save()
                login(request, user)
                return redirect('student_profile')
        elif 'login_submit' in request.POST:
            signup_form = CustomStudentSignupForm()
            login_form = CustomStudentAuthenticationForm(data=request.POST)
            if login_form.is_valid():
                user = login_form.get_user()
                login(request, user)
                return redirect('student_profile')
    else:
        signup_form = CustomStudentSignupForm()
        login_form = CustomStudentAuthenticationForm()

    context = {
        'signup_form': signup_form,
        'login_form': login_form,
    }
    return render(request, 'student_activities/login.html', context)

def logout_view(request):
    logout(request)
    return redirect('student_activities_index')

def student_profile(request):
    """Display the student's profile page"""
    return render(request, 'student_activities/student_profile.html', {})

def inbox_view(request):
    """Display the student's inbox page"""
    return render(request, 'student_activities/inbox.html', {})

def bioinformatics_d1_view(request):
    return render(request, 'student_activities/module_bioinfo_D1.html', {})

def bioinformatics_d2_view(request):
    return render(request, 'student_activities/module_bioinfo_D2.html', {})

def bioinformatics_d3_view(request):
    return render(request, 'student_activities/module_bioinfo_D3.html', {})

def bioinformatics_d4_view(request):
    return render(request, 'student_activities/module_bioinfo_D4.html', {})

def bioinformatics_d5_view(request):
    return render(request, 'student_activities/module_bioinfo_D5.html', {})

def pre_mod_quiz(request):
    return render(request, 'student_activities/pre_module_quiz.html', {})

def post_mod_quiz(request):
    return render(request, 'student_activities/post_module_quiz.html', {})
