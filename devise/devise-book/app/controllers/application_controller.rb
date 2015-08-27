class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  before_action :configure_permitted_parameters, if: :devise_controller?

  layout :layout_by_resource

  protected
  def layout_by_resource
    if devise_controller?
      if resource_name == :admin
        'devise_admin_application'
      elsif resource_name == :employee
        'devise_employee_application'
      else
        'devise_application'
      end
    else
      'application'
    end
  end
  def configure_permitted_parameters
    devise_parameter_sanitizer.for(:sign_in) {|u| u.permit(:signin)}
    devise_parameter_sanitizer.for(:sign_up) {|u| u.permit(:username, :password, :email, :password_confirmation)}
  end
end
