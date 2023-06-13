// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

// Create an instance of Express
const app = express();
app.use(express.static("public"))
// Set the view engine to EJS
app.set('view engine', 'ejs');

// Set up body-parser middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to MongoDB using Mongoose
const connectDB = async () => {
    try {
mongoose.connect(process.env.mongokey, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log('MongoDB connected');
    } catch (error) {
console.error(error.message);
process.exit(1);

    }
};

  


// Create a schema for the Employee model
const paymentSchema = new mongoose.Schema({
    date: Date,
    amount: Number,
    type: String, // 'income' or 'payment'
  });
  const employeeSchema = new mongoose.Schema({
    name: String,
    dateOfJoining: Date,
    monthlyIncome: Number,
    totalAmount: Number,
    payments: [paymentSchema], // Array of payment subdocuments
  });

// Create the Employee model using the schema
const Employee = mongoose.model('Employee', employeeSchema);

// Define routes

// GET route for the home page
app.get('/', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.render('index', { employees });
  } catch (error) {
    console.error('Error retrieving employees:', error);
    res.status(500).send('Internal Server Error');
  }
});

// GET route for managing employees
app.get('/manage', async (req, res) => {
    try {
      const employees = await Employee.find();
      res.render('manage', { employees });
    } catch (error) {
      console.error('Error retrieving employees:', error);
      res.status(500).send('Internal Server Error');
    }
  });

// GET route for employee details
app.get('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    res.render('employee-details', { employee });
  } catch (error) {
    console.error('Error retrieving employee details:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST route to add a new employee
app.post('/addEmployee', async (req, res) => {
  try {
    const { name, dateOfJoining, monthlyIncome, initialPayment } = req.body;

    const newEmployee = new Employee({
      name:name,
      dateOfJoining:dateOfJoining,
      monthlyIncome:monthlyIncome,
      totalAmount: initialPayment,
      payments: [
        {
          date: new Date(),
          amount: initialPayment,
          type: 'income',
        },
      ],
    });

    await newEmployee.save();
    res.redirect('/');
  } catch (error) {
    console.error('Error adding new employee:', error);
    res.status(500).send('Internal Server Error');
  }
});

// app.post('/addEmployee', async (req, res) => {
//     try {
//       const { name, dateOfJoining, monthlyIncome, initialPayment } = req.body;
  
//       const newEmployee = new Employee({
//         name,
//         dateOfJoining,
//         monthlyIncome,
//         totalAmount: initialPayment,
//         payments: JSON.parse(req.body.payments), // Parse the payments string into an array of objects
//       });
  
//       await newEmployee.save();
//       res.redirect('/');
//     } catch (error) {
//       console.error('Error adding new employee:', error);
//       res.status(500).send('Internal Server Error');
//     }
//   });

  // Define a function to add salary to all employees
// Define the function to add salary to employees
function addSalaryToEmployees() {
    const currentDate = new Date();
    const currentDateOnly = new Date(currentDate.toISOString().split('T')[0]);
    console.log( currentDateOnly);
    console.log( currentDate);
  
    Employee.find({
        $expr: {
          $eq: [
            { $dayOfMonth: { date: '$dateOfJoining' } },
            { $dayOfMonth: { date: currentDateOnly } }
          ]
        }
    })
      .then((employees) => {

        employees.forEach(async (employee) => {
                    const { monthlyIncome } = employee;
              
                    employee.payments.push({
                      date: new Date(),
                      amount: monthlyIncome,
                      type: 'income',
                    });
              
                    employee.totalAmount += monthlyIncome;
              
                    await employee.save();
                  });
              
                  console.log('Salary added to all employees');
                } )
        .catch((error) => {
            console.error('Error retrieving employees:', error);
            }
        );  
  }
// Schedule the task to add salary every day at 01:06 AM
cron.schedule('6 1 * * *', () => {
  addSalaryToEmployees();
});


  

  

  //old code
// const addSalaryToEmployees = async () => {
//     try {
//       // Retrieve all employees from the database
//       const employees = await Employee.find();
  
//       // Iterate over each employee and add the monthly income as a salary
//       employees.forEach(async (employee) => {
//         const { monthlyIncome } = employee;
  
//         employee.payments.push({
//           date: new Date(),
//           amount: monthlyIncome,
//           type: 'income',
//         });
  
//         employee.totalAmount += monthlyIncome;
  
//         await employee.save();
//       });
  
//       console.log('Salary added to all employees');
//     } catch (error) {
//       console.error('Error adding salary to employees:', error);
//     }
//   };
  
//   cron.schedule('0 0 */30 * *', () => {
//     addSalaryToEmployees();
//   });
  



// POST route to delete an employee
app.post('/deleteEmployee/:id', async (req, res) => {
  try {
    await Employee.findByIdAndRemove(req.params.id);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).send('Internal Server Error');
  }
});

// POST route to make a payment to an employee
app.post('/employees/:id/payments', async (req, res) => {
  try {
    const { amount } = req.body;
    const employee = await Employee.findById(req.params.id);

    const payment = {
      date: new Date(),
      amount:amount,
      type: 'payment',
    };
    employee.payments.push(payment);

    employee.totalAmount -= amount;

    await employee.save();
    res.redirect(`/employees/${req.params.id}`);
  } catch (error) {
    console.error('Error making payment:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Start the server
connectDB().then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server started on port 3000');
      })
})

