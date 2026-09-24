import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier for authentication
    instead of usernames.
    """
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address must be provided.")
        email = self.normalize_email(email).lower()
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Production custom User model for VERIFAI.
    Uses UUID primary key and email as the unique login credential.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique User UUID"
    )
    email = models.EmailField(
        unique=True,
        max_length=255,
        db_index=True,
        help_text="Primary email address used for login"
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    institution = models.CharField(
        max_length=255,
        blank=True,
        help_text="Academic institution or organizational affiliation"
    )
    role = models.CharField(
        max_length=50,
        default='Researcher',
        help_text="User role (e.g. Researcher, Fact-Checker, Student, Admin)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active."
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the admin site."
    )

    date_joined = models.DateTimeField(
        default=timezone.now,
        help_text="Timestamp when the user account was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the user account was last modified"
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'verifai_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email