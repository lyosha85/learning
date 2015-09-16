Rails.application.routes.draw do
  root 'tasks#index'
  resources :users
  resources :tasks
  get    '/login'  => 'sessions#new'
  post   '/login'  => 'sessions#create'
  delete '/logout' => 'sessions#destroy'
  resources :subscriptions, only: [:create]
end
