from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing and updating user profile information.
    """
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'institution',
            'role',
            'is_staff',
            'date_joined',
            'updated_at',
        ]
        read_only_fields = ['id', 'email', 'is_staff', 'date_joined', 'updated_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for registering a new user account with secure password validation.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        validators=[validate_password]
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'confirm_password',
            'first_name',
            'last_name',
            'institution',
            'role',
        ]

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for authenticating users via email and password.
    Returns user instance upon successful authentication.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password')

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This user account has been disabled.")

        attrs['user'] = user
        return attrs


class UserLogoutSerializer(serializers.Serializer):
    """
    Serializer for invalidating and blacklisting a refresh token.
    """
    refresh = serializers.CharField(required=True, help_text="The JWT refresh token to blacklist")

    def validate(self, attrs):
        self.token = attrs['refresh']
        return attrs

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.token)
            token.blacklist()
        except Exception as e:
            raise serializers.ValidationError({"refresh": "Invalid or expired refresh token."})
