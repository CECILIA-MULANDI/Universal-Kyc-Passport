fn main(
    birthdate_year: u32,
    birthdate_month: u32,
    birthdate_day: u32,
    current_year: u32,
    current_month: u32,
    current_day: u32,
    minimum_age: u32
) -> pub bool {
    let mut age = current_year - birthdate_year;
    // We need to adjust age if birthday has not occurred
    let month_before = current_month < birthdate_month;
    let same_month_day_before = (current_month == birthdate_month) & (current_day < birthdate_day);
    if month_before | same_month_day_before {
        age = age - 1;
    }
    age >= minimum_age
}

#[test]
fn test_main() {
    let result = main(2001, 10, 17, 2025, 11, 9, 18);
    assert(result);
}

#[test]
fn test_main_fails() {
    let result = main(2017, 10, 17, 2025, 1, 9, 18);
    assert(result == false);
}