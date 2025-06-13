from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import get_user_model
from classroom_admin.models import Classroom, Student

class CustomStudentSignupForm(UserCreationForm):
    classroom_name = forms.CharField(
        max_length=100, 
        required=True, 
        help_text="Enter the classroom name you belong to."
    )

    class Meta:
        model = get_user_model()
        fields = ['username', 'password1', 'password2', 'first_name', 'last_name']

    def clean_classroom_name(self):
        classroom_name = self.cleaned_data.get('classroom_name')
        try:
            classroom = Classroom.objects.get(name=classroom_name)
        except Classroom.DoesNotExist:
            raise forms.ValidationError("The classroom does not exist. Please enter a valid classroom name.")
        return classroom

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_student = True  # Flag the user as a student
        user.first_name = self.cleaned_data.get('first_name')
        user.last_name = self.cleaned_data.get('last_name')
        if commit:
            user.save()
            classroom = self.cleaned_data['classroom_name']
            # Create the Student profile record linked to the user.
            Student.objects.create(
                user=user, 
                classroom=classroom,
                first_name=user.first_name,
                last_name=user.last_name
            )
        return user

class CustomStudentAuthenticationForm(AuthenticationForm):
    username = forms.CharField(widget=forms.TextInput(attrs={'class': 'form-control'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control'}))
