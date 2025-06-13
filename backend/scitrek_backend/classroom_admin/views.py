#classroom_admin/views.py
from django.shortcuts import render
from .models import Classroom, Student

def index(request):
    """
    Display a list of classrooms along with their enrolled students.
    """
    classrooms = Classroom.objects.all()
    students = Student.objects.all()
    context = {
        'classrooms': classrooms,
        'students': students,
    }
    return render(request, "classroom_admin/index.html", context)
