import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { MyFinance } from 'src/app/core/utils/my-finance.util';
import { api } from 'src/app/shared/api/api';
import Swal from 'sweetalert2';
import { ChangePasswordModalComponent } from '../components/modal/change-password-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbComponent, ButtonComponent],
})
export class ProfileComponent extends MyFinance implements OnInit {
  form!: FormGroup;
  userId: string = '';
  currentPhoto: string = '';
  isAdmin: boolean = false;
  loading: boolean = true;
  submitted: boolean = false;
  uploadingPhoto: boolean = false;
  removingPhoto: boolean = false;

  constructor(private dialog: Dialog) {
    super();
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
    });

    await this.loadProfile();
  }

  async loadProfile() {
    try {
      this.loading = true;
      const { data } = await api.get('/users/me');
      const user = data.data || data;

      this.userId = user.id || user._id || '';
      this.currentPhoto = user.photo || '';
      this.isAdmin = !!user.admin;

      this.form.patchValue({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });

      const updatedUser = {
        id: this.userId,
        name: user.name || '',
        email: user.email || '',
        photo: this.currentPhoto,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastWarning('Selecione um arquivo de imagem válido.');
      return;
    }

    try {
      this.uploadingPhoto = true;
      const formData = new FormData();
      formData.append('photo', file);

      const { data } = await api.put('/users/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const photoUrl = data.data || data;
      this.currentPhoto = photoUrl;
      this.toastSuccess('Foto de perfil atualizada com sucesso!');

      const currentUser = this.getUser();
      currentUser.photo = photoUrl;
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.uploadingPhoto = false;
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  async removePhoto() {
    const result = await Swal.fire({
      title: 'Remover foto de perfil?',
      text: 'Você voltará a ter o avatar padrão.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      this.removingPhoto = true;
      const formData = new FormData();
      await api.put('/users/remove-profile-photo', formData);

      this.currentPhoto = '';
      this.toastSuccess('Foto de perfil removida com sucesso!');

      const currentUser = this.getUser();
      currentUser.photo = '';
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.removingPhoto = false;
      this.cdr.markForCheck();
    }
  }

  openChangePasswordModal() {
    this.dialog.open(ChangePasswordModalComponent, {
      data: {
        id: this.userId,
        email: this.form.get('email')?.value,
        name: this.form.get('name')?.value,
        phone: this.form.get('phone')?.value,
        admin: this.isAdmin,
      },
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.toastWarning('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const { name, email, phone } = this.form.value;

    try {
      this.submitted = true;
      const payload: any = {
        id: this.userId,
        name: name.trim(),
        email: email.trim(),
        phone: (phone || '').trim(),
        admin: this.isAdmin,
      };

      const { data } = await api.put('/users', payload);
      this.toastSuccess(data?.message || 'Perfil atualizado com sucesso!');

      const currentUser = this.getUser();
      currentUser.name = payload.name;
      currentUser.email = payload.email;
      currentUser.photo = this.currentPhoto;
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (error) {
      this.normalizeErr(error);
    } finally {
      this.submitted = false;
      this.cdr.markForCheck();
    }
  }
}
