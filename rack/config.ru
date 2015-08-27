@hai = 0
run Proc.new {|env| ['200', {'Content-Type'=>'text/html'} , ['hur',"#{@hai;@hai=@hai*@hai}"]]}
