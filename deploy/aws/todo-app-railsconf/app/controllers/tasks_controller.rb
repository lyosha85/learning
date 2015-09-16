class TasksController < ApplicationController
  before_action :logged_in_user, only: [:new, :create, :update]

  VALID_TASK_STATES = ["TODO", "WIP", "DONE", "CANCELED"]

  def index
    @tasks = Task.all
  end

  def new
    @task = Task.new
  end

  def create
    new_task_params = task_params
    new_task_params["user_id"] = created_by_user
    new_task_params["state"] = VALID_TASK_STATES.first
    @task = Task.new(new_task_params)
    if @task.save
      redirect_to @task
    else
      render :new
    end
  end

  def update
    task = Task.find(params[:id])
    send_update_email = true if new_state?(task, task_update_params)
    if task.update_attributes(task_update_params)
      if send_update_email
        task.update_subscribers
      end
      flash[:success] = "Task Updated"
      redirect_to task
    else
      render task
    end
  end

  def show
    @task = Task.find(params[:id])
    @created_by_user = User.find(@task.user_id)
    @valid_states = VALID_TASK_STATES
    if logged_in? && !@task.subscriber?(current_user)
      @subscription = Subscription.new(
        user_id: current_user.id,
        task_id: @task.id
      )
    end
  end

  private
  def task_params
    params.require(:task)
      .permit(:name, :description)
  end

  def task_update_params
    params.require(:task)
      .permit(:name, :description, :state)
  end

  def created_by_user
    current_user.id
  end

  def new_state?(task, params)
    if params["state"] && params["state"] != task.state
      true
    else
      false
    end
  end
end
