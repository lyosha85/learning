class RegistrationsController < Devise::RegistrationsController
  def update
    new_params = params.require(:user).permit(
      :username, :email,
      :password,:password_confirmation, :current_password)

    @user = User.find(current_user.id)

    if @user.update_with_password(new_params)
      set_flash_message :notice, :updated
      sign_in @user, bypass: true
      redirect_to after_update_path_for(@user)
    else
      set_flash_message :alert, :error
      render :edit
    end
  end
end
