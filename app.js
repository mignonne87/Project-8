const express = require("express");
const sequelize = require("./models").sequelize;
const Op = require("sequelize").Op;
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const Book = require("./models").Book;
const itemsPerPage = 5;

app.set("view engine", "pug");
app.use("/static", express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

//Routes


app.get("/", (req, res) => {
  res.redirect("/books");
});

//search from the search bar
app.post("/books", (req, res) => {
  res.redirect(`/books/?column=${req.body.column}&searchWord=${req.body.searchWord}&&page=1`);
});

// search books to get total number of pages.
app.get("/books", (req, res) => {
  const column = req.query.column || "title";
  const searchWord = req.query.searchWord || "";
  const page = req.query.page || 1;
  Book.findAll({
    where: {
      [column]: {
        [Op.like]: "%" + searchWord + "%"
      }
    }
  }).then(totalBooks => {
    Book.findAll({
      where: {
        [column]: {
          [Op.like]: "%" + searchWord + "%"
        }
      },
      offset: page * itemsPerPage - itemsPerPage,
      limit: itemsPerPage
    })
      .then(books => {
        if (!books || books.length === 0) {
          const err = new Error("No books found");
          throw err;
        }
        const totalPages = Math.ceil(totalBooks.length / itemsPerPage);
        res.render("index", { books, totalPages, column, searchWord });
      })
      .catch(err => {
        res.render("error", { err });
      });
  });
});

// new book form
app.get("/books/new", (req, res) => {
  const book = {
    title: "",
    author: "",
    genre: "",
    year: ""
  }
  res.render("new-book", {book});
});

//create new book
app.post("/books/new", (req, res) => {
  Book.create(req.body)
    .then(() => {
      res.redirect("/books");
    })
    .catch(err => {
      if (err.name === "SequelizeValidationError") {
        res.render("new-book", { errors: err.errors, book: req.body});
      } else {
        throw err;
      }
    })
    .catch(err => {
      res.render("error", { err });
    });
});

//book details
app.get("/books/:id", (req, res) => {
  Book.findByPk(req.params.id)
    .then(book => {
      if (!book) {
        const err = new Error("Book not found");
        throw err;
      }
      res.render("update-book", { book, bookId: req.params.id });
    })
    .catch(err => {
      res.render("error", { err });
    });
});

//update book
app.post("/books/:id", (req, res) => {
  Book.findByPk(req.params.id)
    .then(book => {
      if (book) {
        return book
          .update(req.body)
          .then(book => {
            res.redirect("/books");
          })
          .catch(err => {
            if (err.name === "SequelizeValidationError") {
              res.render("update-book", {
                errors: err.errors,
                book: req.body,
                bookId: req.params.id
              });
            } else {
              res.render("error", { err });
            }
          });
      } else {
        const err = new Error("The book doesn't exist");
        throw err;
      }
    })
    .catch(err => {
      res.render("error", { err });
    });
});

//Delete Book
app.post("/books/:id/delete", (req, res) => {
  Book.findByPk(req.params.id)
    .then(book => {
      if (book) {
        return book.destroy();
      } else {
        const err = new Error("The book doesn't exist");
        throw err;
      }
    })
    .then(book => {
      res.redirect("/books");
    })
    .catch(err => {
      res.render("error", { err });
    });
});

//page not found
app.use((req, res, next) => {
  let err = new Error("Page not found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.locals.errors = err;
  res.status(err.status);
  if (err.message === "Page not found") {
    res.render("page-not-found");
  } else {
    res.render("error", { err });
  }
});

//
//table creation and port message
//
sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`application running on port ${port}`);
  });
});